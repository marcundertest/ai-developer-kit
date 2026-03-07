import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// configurable severity classifications
import { severityMap, Severity } from './severity.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const reportsDir = path.join(rootDir, '.integrity-suite', 'tests', 'reports');
const resultsPath = path.join(reportsDir, 'results.json');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const reportFileName = `audit-report-${timestamp}.html`;
const htmlPath = path.join(reportsDir, reportFileName);

function sanitizePaths(text: string): string {
  if (!text) return text;
  return text
    .replace(/[a-zA-Z]:\\Users\\[^\\]+\\/g, '~/')
    .replace(/\/Users\/[^/]+\//g, '~/')
    .replace(/\/home\/[^/]+\//g, '~/');
}

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

try {
  try {
    execSync(
      `pnpm exec vitest run .integrity-suite/tests --reporter=json --outputFile="${resultsPath}"`,
      {
        cwd: rootDir,
        stdio: 'inherit',
      },
    );
  } catch (error) {
    // ignore failures, continue to build report
  }
  if (!fs.existsSync(resultsPath)) {
    throw new Error('Results file was not generated. Check if vitest ran correctly.');
  }

  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

  interface CategoryData {
    passed: number;
    failed: number;
    total: number;
    tests: any[];
    sortKey: number;
    severities: {
      critical: any[];
      high: any[];
      medium: any[];
      low: any[];
    };
  }
  const categories: Record<string, CategoryData> = {};
  data.testResults.forEach((fileResult: any) => {
    fileResult.assertionResults.forEach((test: any) => {
      const categoryMatch = test.ancestorTitles[0]?.match(/Level (\d+): ([^@]+)/);
      let categoryName = 'General';
      let sortKey = 999;

      if (categoryMatch) {
        categoryName = `Level ${categoryMatch[1]}: ${categoryMatch[2].trim()}`;
        sortKey = parseInt(categoryMatch[1], 10);
      } else if (test.ancestorTitles.includes('Core Protection Suite')) {
        categoryName = 'Core Protection';
        sortKey = -1;
      }

      if (!categories[categoryName]) {
        categories[categoryName] = {
          passed: 0,
          failed: 0,
          total: 0,
          tests: [],
          sortKey,
          severities: { critical: [], high: [], medium: [], low: [] },
        };
      }

      let severity: Severity = 'low';
      const rawTitle = test.title.toLowerCase();
      const allAncestors = test.ancestorTitles.join(' ').toLowerCase();

      // first check custom map entries; matching any tag in title or describe
      for (const [tag, sev] of Object.entries(severityMap)) {
        const lowered = tag.toLowerCase();
        if (rawTitle.includes(lowered) || allAncestors.includes(lowered)) {
          severity = sev;
          break;
        }
      }

      // fallback heuristics for legacy keywords
      if (severity === 'low') {
        if (
          rawTitle.includes('security') ||
          rawTitle.includes('unauthorized') ||
          rawTitle.includes('secret') ||
          test.ancestorTitles.includes('Core Protection Suite')
        ) {
          severity = 'critical';
        } else if (
          rawTitle.includes('forbid') ||
          rawTitle.includes('never') ||
          rawTitle.includes('require')
        ) {
          severity = 'high';
        } else if (
          rawTitle.includes('should check') ||
          rawTitle.includes('lint') ||
          rawTitle.includes('format')
        ) {
          severity = 'medium';
        } else {
          severity = 'low';
        }
      }

      test.severity = severity;
      categories[categoryName].severities[
        severity as keyof (typeof categories)[string]['severities']
      ].push(test);

      categories[categoryName].total++;
      if (test.status === 'passed') {
        categories[categoryName].passed++;
      } else {
        categories[categoryName].failed++;
      }
      categories[categoryName].tests.push(test);
    });
  });

  const totalTests = data.numTotalTests;
  const passedTests = data.numPassedTests;
  const failedTests = data.numFailedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  // Historical trend persistence
  const historyPath = path.join(reportsDir, 'history.json');
  let history: Array<{ date: string; score: number; passed: number; total: number }> = [];
  try {
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch {
    history = [];
  }

  history.push({
    date: new Date().toISOString(),
    score: Number(successRate),
    passed: passedTests,
    total: totalTests,
  });

  const recentHistory = history.slice(-30);
  fs.writeFileSync(historyPath, JSON.stringify(recentHistory, null, 2));

  function generateSparkline(data: number[]): string {
    if (data.length < 2) return '';
    const width = 160;
    const height = 40;
    const padding = 5;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    const centerValue = data[data.length - 1];
    const visualRange = Math.max(range, 2);
    const visualMin = centerValue - visualRange / 2;
    const visualMax = centerValue + visualRange / 2;

    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    let pointColor = 'hsl(var(--primary))';
    if (last > prev) pointColor = 'hsl(var(--success))';
    else if (last < prev) pointColor = 'hsl(var(--destructive))';
    else pointColor = '#3b82f6'; // Blue

    const points = data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height / 2 - (((val - centerValue) / visualRange) * (height - padding * 2)) / 2;
        return `${x},${y}`;
      })
      .join(' ');

    return `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible; display: block;">
        <polyline fill="none" stroke="hsl(var(--primary) / 0.3)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
        ${data
          .map((val, i) => {
            const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
            const y =
              height / 2 - (((val - centerValue) / visualRange) * (height - padding * 2)) / 2;
            if (i === data.length - 1) {
              return `<circle cx="${x}" cy="${y}" r="5" fill="${pointColor}" stroke="white" stroke-width="1.5" />`;
            }
            return '';
          })
          .join('')}
      </svg>
    `;
  }

  const sparklineSvg = generateSparkline(recentHistory.map((h) => h.score));

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integrity Suite Audit Report</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=block" rel="stylesheet">
    <style>
        :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --card: 0 0% 100%;
            --card-foreground: 222.2 84% 4.9%;
            --popover: 0 0% 100%;
            --popover-foreground: 222.2 84% 4.9%;
            --primary: 222.2 47.4% 11.2%;
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96.1%;
            --secondary-foreground: 222.2 47.4% 11.2%;
            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 210 40% 96.1%;
            --accent-foreground: 222.2 47.4% 11.2%;
            --destructive: 0 84.2% 60.2%;
            --destructive-foreground: 210 40% 98%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 222.2 84% 4.9%;
            --radius: 0.5rem;
            --success: 142.1 76.2% 36.3%;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', -apple-system, system-ui, sans-serif;
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            line-height: 1.5;
            padding: 3rem 1rem;
            -webkit-font-smoothing: antialiased;
            opacity: 0;
            transition: opacity 0.2s ease-in;
        }

        body.fonts-loaded {
            opacity: 1;
        }

        .container { max-width: 800px; margin: 0 auto; }

        header {
            margin-bottom: 2.5rem;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            border-bottom: 1px solid hsl(var(--border));
            padding-bottom: 1.5rem;
        }

        h1 { font-size: 1.875rem; font-weight: 700; letter-spacing: -0.025em; color: hsl(var(--primary)); }
        .version-tag { font-size: 0.875rem; font-weight: 500; color: hsl(var(--muted-foreground)); margin-left: 0.5rem; }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 1rem;
            margin-bottom: 3rem;
        }

        .summary-item {
            padding: 1rem;
            border: 1px solid hsl(var(--border));
            border-radius: var(--radius);
            background: hsl(var(--card));
            transition: all 0.2s ease;
            text-align: left;
            width: 100%;
            display: block;
            appearance: none;
            -webkit-appearance: none;
            font-family: inherit;
            font-size: inherit;
            line-height: inherit;
            color: inherit;
            min-width: 0;
            overflow: hidden;
        }

        .summary-item.clickable {
            cursor: pointer;
            user-select: none;
        }

        .summary-item.clickable:hover {
            border-color: hsl(var(--primary) / 0.5);
            background: hsl(var(--muted) / 0.3);
            transform: translateY(-2px);
        }

        .summary-item.active {
            border-color: hsl(var(--primary));
            background: hsl(var(--muted) / 0.5);
            box-shadow: 0 4px 12px -4px hsl(var(--primary) / 0.2);
        }

        .summary-label { 
            font-size: 0.75rem; 
            font-weight: 500; 
            color: hsl(var(--muted-foreground)); 
            text-transform: uppercase; 
            display: block;
            margin-bottom: 0.25rem;
            pointer-events: none;
        }
        .summary-value { 
            font-size: 1.5rem; 
            font-weight: 600; 
            display: block; 
            pointer-events: none;
        }

        .value-success { color: hsl(var(--success)); }
        .value-destructive { color: hsl(var(--destructive)); }

        .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: hsl(var(--foreground));
            letter-spacing: -0.01em;
        }

        .category-card {
            border: 1px solid hsl(var(--border));
            border-radius: var(--radius);
            margin-bottom: 1.5rem;
            background: hsl(var(--card));
            overflow: hidden;
        }

        .category-header {
            padding: 0.75rem 1rem;
            background: hsl(var(--muted));
            border-bottom: 1px solid hsl(var(--border));
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .category-header h3 { font-size: 0.875rem; font-weight: 600; color: hsl(var(--primary)); }
        .category-meta { font-size: 0.75rem; color: hsl(var(--muted-foreground)); }

        .test-list { list-style: none; }
        .test-item {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid hsl(var(--border));
            display: flex;
            flex-direction: column;
        }
        .test-item:last-child { border-bottom: none; }

        .test-row { display: flex; align-items: flex-start; gap: 0.75rem; }
        .status-indicator {
            margin-top: 0.35rem;
            width: 0.5rem;
            height: 0.5rem;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .status-passed { background-color: hsl(var(--success)); }
        .status-failed { background-color: hsl(var(--destructive)); }

        .test-title { font-size: 0.875rem; color: hsl(var(--foreground)); }
        
        .error-box {
            margin-top: 0.75rem;
            margin-left: 1.25rem;
            padding: 0.75rem;
            background-color: hsl(var(--destructive) / 0.1);
            border-radius: calc(var(--radius) - 0.2rem);
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 0.75rem;
            color: hsl(var(--destructive));
            white-space: pre-wrap;
            border: 1px solid hsl(var(--destructive) / 0.2);
            word-wrap: break-word;
        }

        footer {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid hsl(var(--border));
            text-align: center;
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
        }

        footer a {
            color: inherit;
            text-decoration: underline;
        }

        @media (max-width: 640px) {
            .summary-grid { grid-template-columns: repeat(2, 1fr); }
            body { padding: 1.5rem 1rem; }
        }
    </style>
</head>
<body class="no-fout">
    <script>
        // Prevent FOUT (Flash of Unstyled Text)
        (function() {
            const showBody = () => document.body.classList.add('fonts-loaded');
            if ('fonts' in document) {
                document.fonts.ready.then(showBody);
                // Fallback after 1s
                setTimeout(showBody, 1000);
            } else {
                showBody();
            }
        })();
    </script>
    <div class="container">
        <header>
            <div>
                <h1>Architecture Audit</h1>
                <p style="color: hsl(var(--muted-foreground)); font-size: 0.875rem; margin-top: 0.25rem;">Integrity Suite Report</p>
            </div>
            <span class="version-tag">v${pkg.version}</span>
        </header>

        <div class="summary-grid">
            <div class="summary-item">
                <span class="summary-label">Score</span>
                <span class="summary-value ${Number(successRate) >= 90 ? 'value-success' : 'value-destructive'}">${successRate}%</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Tests</span>
                <span class="summary-value">${totalTests}</span>
            </div>
            <button class="summary-item clickable filter-trigger" data-filter="passed" type="button" style="cursor:pointer; user-select:none; background-color:hsl(var(--card))">
                <span class="summary-label">Passed</span>
                <span class="summary-value value-success">${passedTests}</span>
            </button>
            <button class="summary-item clickable filter-trigger" data-filter="failed" type="button" style="cursor:pointer; user-select:none; background-color:hsl(var(--card))">
                <span class="summary-label">Failed</span>
                <span class="summary-value value-destructive">${failedTests}</span>
            </button>
            <div class="summary-item">
                <span class="summary-label">Trend (Last 30)</span>
                <div style="margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; height: 40px;">
                    ${sparklineSvg || '<span style="font-size: 0.75rem; color: hsl(var(--muted-foreground));">Insufficient data</span>'}
                </div>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2 class="section-title" style="margin-bottom: 0;">Analysis Findings</h2>
            <button id="clear-filters" class="filter-trigger" data-filter="all" type="button" style="cursor:pointer; user-select:none; display:none; background:none; border:none; color:hsl(var(--primary)); text-decoration:underline; font-size:0.875rem; padding:0; font-family:inherit;">Clear filters</button>
        </div>
        <main>
            ${Object.entries(categories)
              .sort((a, b) => a[1].sortKey - b[1].sortKey)
              .map(
                ([name, data]) => `
                <div class="category-card">
                    <div class="category-header">
                        <h3>${name}</h3>
                        <span class="category-meta">${data.passed} / ${data.total} passed</span>
                    </div>
                    ${['critical', 'high', 'medium', 'low']
                      .map((sev) => {
                        const sevTests = data.severities[sev as keyof typeof data.severities];
                        if (sevTests.length === 0) return '';

                        return `
                        <div class="severity-group severity-${sev}" style="border-top: 1px solid hsl(var(--border)); background: hsl(var(--card));">
                          <h4 style="font-size: 0.75rem; text-transform: uppercase; padding: 0.5rem 1rem; color: hsl(var(--muted-foreground)); background: hsl(var(--muted) / 0.5); border-bottom: 1px solid hsl(var(--border)); letter-spacing: 0.05em; font-weight: 600;">
                            ${sev.toUpperCase()} SEVERITY
                          </h4>
                          <ul class="test-list">
                                ${sevTests
                                  .map(
                                    (test) => `
                                    <li class="test-item" data-status="${test.status}" data-severity="${test.severity}">
                                        <div class="test-row">
                                            <div class="status-indicator status-${test.status}"></div>
                                            <span class="test-title">${test.title}</span>
                                        </div>
                                        ${
                                          test.status === 'failed'
                                            ? `
                                            <div class="error-box">${test.failureMessages
                                              .map((m: string) => sanitizePaths(m))
                                              .join('\n')
                                              .replace(/</g, '&lt;')}</div>
                                        `
                                            : ''
                                        }
                                    </li>
                                `,
                                  )
                                  .join('')}
                            </ul>
                        </div>
                        `;
                      })
                      .join('')}
                </div>
            `,
              )
              .join('')}
        </main>

        <footer>
            Audited on ${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')} ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}:${String(new Date().getSeconds()).padStart(2, '0')} | Made with <a href="https://vitest.dev/" target="_blank" rel="noopener noreferrer" style="cursor:pointer">Vitest</a> and <a href="https://github.com/marcundertest/integrity-suite" target="_blank" rel="noopener noreferrer" style="cursor:pointer">Integrity Suite v${pkg.version}</a> by <a href="https://github.com/marcundertest" target="_blank" rel="noopener noreferrer" style="cursor:pointer">marcundertest</a>.
        </footer>
    </div>

    <script>
        (function() {
            const triggers = document.querySelectorAll('.filter-trigger');
            const items = document.querySelectorAll('.test-item');
            const cards = document.querySelectorAll('.category-card');
            const clearBtn = document.getElementById('clear-filters');

            function filter(status, activeEl) {
                const isToggleOff = activeEl && activeEl.classList.contains('active');
                const finalStatus = isToggleOff ? 'all' : status;

                triggers.forEach(t => {
                    if (t.classList.contains('summary-item')) {
                        t.classList.remove('active');
                    }
                });

                if (!isToggleOff && activeEl && activeEl.classList.contains('summary-item')) {
                    activeEl.classList.add('active');
                }

                clearBtn.style.display = finalStatus === 'all' ? 'none' : 'inline-block';

                items.forEach(item => {
                    const matches = finalStatus === 'all' || item.getAttribute('data-status') === finalStatus;
                    item.style.display = matches ? 'flex' : 'none';
                });

                cards.forEach(card => {
                    const hasVisibleItems = Array.from(card.querySelectorAll('.test-item')).some(i => i.style.display !== 'none');
                    card.style.display = hasVisibleItems ? 'block' : 'none';
                });
            }

            triggers.forEach(t => {
                t.addEventListener('click', function() { filter(t.getAttribute('data-filter'), t); });
            });
        })();
    </script>
</body>
</html>
`;

  fs.writeFileSync(htmlPath, htmlContent);

  if (fs.existsSync(resultsPath)) {
    try {
      fs.unlinkSync(resultsPath);
    } catch {}
  }

  try {
    const openCmd =
      process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    execSync(`${openCmd} "${htmlPath}"`);
  } catch (e) {}
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`Report generation failed: ${msg}\n`);
  if (fs.existsSync(resultsPath)) {
    process.stderr.write(`Raw results preserved for inspection at: ${resultsPath}\n`);
  }
  process.exit(1);
}

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const reportsDir = path.join(rootDir, '.integrity-suite', 'tests', 'reports');
const resultsPath = path.join(reportsDir, 'results.json');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const reportFileName = `audit-report-${timestamp}.html`;
const htmlPath = path.join(reportsDir, reportFileName);

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

console.log('🚀 Generating Integrity Suite Audit Report...');

try {
  // 1. Run Vitest with JSON reporter to collect results from all suites
  console.log('📦 Running meta-tests...');
  execSync(`npx vitest run .integrity-suite/tests --reporter=json --outputFile="${resultsPath}"`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
} catch (error) {
  console.log(
    '⚠️  Some tests failed (this is expected in a real audit). Proceeding to generate report.',
  );
}

// 2. Read and parse results
if (!fs.existsSync(resultsPath)) {
  console.error('❌ Error: Results file was not generated.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

// 3. Helper to group tests by Level / Category
const categories = {};
data.testResults.forEach((fileResult) => {
  fileResult.assertionResults.forEach((test) => {
    // Extract category from title (e.g., [Level 0: ... @tag])
    const categoryMatch = test.ancestorTitles[0]?.match(/Level (\d+): ([^@]+)/);
    const categoryName = categoryMatch
      ? `Level ${categoryMatch[1]}: ${categoryMatch[2].trim()}`
      : 'General';

    if (!categories[categoryName]) {
      categories[categoryName] = { passed: 0, failed: 0, total: 0, tests: [] };
    }

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

// 4. Generate HTML
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integrity Suite Audit Report</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
            font-family: 'Inter', -apple-system, sans-serif;
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            line-height: 1.5;
            padding: 3rem 1rem;
            -webkit-font-smoothing: antialiased;
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
            grid-template-columns: repeat(4, 1fr);
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
<body>
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
                <span class="summary-value ${successRate >= 90 ? 'value-success' : 'value-destructive'}">${successRate}%</span>
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
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2 class="section-title" style="margin-bottom: 0;">Analysis Findings</h2>
            <button id="clear-filters" class="filter-trigger" data-filter="all" type="button" style="cursor:pointer; user-select:none; display:none; background:none; border:none; color:hsl(var(--primary)); text-decoration:underline; font-size:0.875rem; padding:0; font-family:inherit;">Clear filters</button>
        </div>
        <main>
            ${Object.entries(categories)
              .sort()
              .map(
                ([name, data]) => `
                <div class="category-card">
                    <div class="category-header">
                        <h3>${name}</h3>
                        <span class="category-meta">${data.passed} / ${data.total} passed</span>
                    </div>
                    <ul class="test-list">
                        ${data.tests
                          .map(
                            (test) => `
                            <li class="test-item" data-status="${test.status}">
                                <div class="test-row">
                                    <div class="status-indicator status-${test.status}"></div>
                                    <span class="test-title">${test.title}</span>
                                </div>
                                ${
                                  test.status === 'failed'
                                    ? `
                                    <div class="error-box">${test.failureMessages.join('\n').replace(/</g, '&lt;')}</div>
                                `
                                    : ''
                                }
                            </li>
                        `,
                          )
                          .join('')}
                    </ul>
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

                // Reset summary active states
                triggers.forEach(t => {
                    if (t.classList.contains('summary-item')) {
                        t.classList.remove('active');
                    }
                });

                // Apply active state if not toggling off
                if (!isToggleOff && activeEl && activeEl.classList.contains('summary-item')) {
                    activeEl.classList.add('active');
                }

                // UI Management
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
console.log(`✅ Report generated successfully at: ${htmlPath}`);

// 5. Auto-open report
try {
  const openCmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  execSync(`${openCmd} "${htmlPath}"`);
} catch (e) {
  console.log('💡 Note: Could not auto-open report, but it is available at:', htmlPath);
}

// Cleanup temporary JSON
if (fs.existsSync(resultsPath)) {
  fs.unlinkSync(resultsPath);
}

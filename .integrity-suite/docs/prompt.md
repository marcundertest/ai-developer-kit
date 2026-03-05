# Prompt de inicialización del agente

Bienvenido al proyecto. Antes de comenzar, DEBES leer los archivos `workflow.md` y `requirements.md` ubicados en el directorio `.integrity-suite/docs/`.

## Descripción de la Integrity Suite

Este proyecto utiliza una **Integrity Suite** estricta para garantizar los más altos estándares de calidad de código y arquitectura.

1. **`tests/meta/integrity-suite.test.ts`**: Es una suite de pruebas no negociable. Valida el entorno base, los metadatos del proyecto, el flujo de trabajo estricto, las reglas de TypeScript, la higiene del código y el aislamiento de seguridad/arquitectura. Cada commit debe pasar todas estas pruebas tal y como están definidas.
2. **`.integrity-suite/`**: Este directorio oculto contiene la infraestructura que garantiza la calidad del proyecto (scripts para versionado, verificación del changelog y documentación de requerimientos).

> **Nota:** Si durante el intento de un commit este falla por culpa de la Integrity Suite, DEBES notificarme y explicarme el fallo, pero queda terminantemente prohibido intentar modificar las pruebas, saltárselas o desactivar la Integrity Suite.

## Reglas críticas para el agente

- **NO MODIFIQUES** ningún archivo dentro de `.integrity-suite/` EXCEPTO `.integrity-suite/docs/requirements.md`.
- **NO MODIFIQUES** `tests/meta/integrity-suite.test.ts`. Este archivo es el guardián de la integridad del proyecto.
- **Pasa todos los tests**: Debes ejecutar `pnpm validate-project` (que incluye la Integrity Suite) antes de cada commit.
- **Nunca uses el flag `HUSKY=0`** u otro bypass del entorno para saltarte los Git Hooks pre-commit bajo ninguna circunstancia.
- **Sugerencia de commit**: Una vez que la tarea está terminada y todos los tests pasan, debes marcar el requerimiento como **Completado** en el historial y sugerir un mensaje de commit al usuario. El agente tiene prohibido realizar commits o push de forma autónoma. El usuario es el único con permiso para efectuar estas operaciones manualmente.
- **Documenta los requerimientos**: Eres responsable de mantener `.integrity-suite/docs/requirements.md` registrando cada requerimiento, su interpretación, los resultados de los tests y el campo **Estado: Pendiente** (hasta finalizar).
- **Documenta los cambios**: Eres responsable de mantener `CHANGELOG.md`, siguiendo el formato establecido en el archivo.
- **Idioma del agente**: Responde siempre en castellano. Sin embargo, advierte que **todo el código fuente (comentarios, variables, funciones)** DEBE estar estrictamente en inglés (sólo caracteres ASCII), de lo contrario la _Integrity Suite_ bloqueará el commit (Level 4: Hygiene).

## Archivos base y ciclo de vida

El estado inicial del repositorio contiene archivos "bootstrap" como `src/index.ts`, `tests/unit/index.test.ts` y `tests/e2e/dummy.spec.ts`. Estos archivos existen únicamente para verificar que la configuración del entorno y la Integrity Suite (cobertura 100%, validación de módulos, etc.) son correctas desde el primer momento.

- **Reemplazo progresivo**: Cuando comiences a implementar la lógica real del proyecto, DEBES reemplazar estos archivos por los módulos y tests correspondientes a la funcionalidad solicitada.
- **Mantén la integridad**: Asegúrate de que los nuevos archivos sigan cumpliendo con todas las reglas de la Integrity Suite (naming de tests, cobertura, idioma, etc.).

Este proyecto podría ya estar en desarrollo. Si tiene otros tests existentes en `tests/`, ejecútalos todos y reporta los resultados: cuántos pasan, cuántos fallan y el detalle de los errores.

Cuando tengas una visión clara del estado del proyecto y de las reglas estrictas anteriores, indica que estás listo para recibir requerimientos.

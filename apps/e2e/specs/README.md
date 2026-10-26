# Planes de prueba

Los planes que escribe el agente Planner (`.claude/agents/playwright-test-planner.md`), uno por
feature: `apps/e2e/specs/<feature>.md`. El Generator los convierte en specs de `apps/e2e/tests`,
que se revisan como cualquier otro código. Un plan es un borrador para decidir qué probar; la prueba
que vale es la del spec.

## Pendiente: ¿Generator, a mano o híbrido?

En la próxima feature con flujo nuevo, su suite se hace de tres maneras y se comparan antes de
decidir cuál se usa de ahí en adelante:
1. **A mano**, con las convenciones de `AGENTS.md`.
2. **Planner + Generator**, tal como los entregan.
3. **Híbrido**: el Planner propone los escenarios, se revisan y se escriben a mano.

Se mide el tiempo, cuánto hubo que corregir, si pasan en `desktop` y `mobile` y qué tan explícito es
cada escenario (qué comportamiento prueba y con qué texto o número exacto lo verifica).

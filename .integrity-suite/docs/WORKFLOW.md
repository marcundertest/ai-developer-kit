# Flujo de trabajo en este proyecto

Este documento es una guía para entender el flujo de trabajo en este proyecto entre el usuario y los agentes del IDE.
Especifica el cómo los agentes que trabajan en el IDE interactúan con el usuario para completar tareas y
resolver problemas.

1. El usuario expresa su requerimiento o necesidad al agente a través del chat.
2. El agente analiza el requerimiento y determina si tiene suficiente información para proceder o si necesita
   más detalles.
   2.1. Si el agente tiene suficiente información, procede a procesar el requerimiento.
   2.2. Si el agente necesita más información, solicita al usuario que proporcione los detalles necesarios.
   2.2.1. El usuario proporciona la información adicional solicitada.
3. El agente procesa la información recibida y crea un registro en el histórico `REQUIREMENTS.md` con el formato
   especificado en el archivo.
   3.1. Comprueba si existen tests que contradigan el requerimiento.
   3.1.1. Si existen tests contradictorios, el agente informa al usuario sobre los conflictos y solicita una resolución.
   3.2. Comprueba si existen tests que apoyen el requerimiento parcialmente.
   3.2.1. Si existen tests que apoyan el requerimiento parcialmente, el agente informa al usuario sobre los aspectos
   que están cubiertos y los que no.
   3.3. Si el requerimiento es completamente nuevo o no tiene conflictos, el agente procede a crear los tests
   necesarios para cubrir el requerimiento.
4. Una vez que los tests están creados o actualizados, el agente ejecuta los tests para verificar que el requerimiento
   se cumple correctamente.
   4.1. Si los tests pasan exitosamente, el agente informa al usuario que el requerimiento ha sido cumplido.
   4.2. Si los tests fallan, el agente revisa el código e itera hasta 5 veces para corregir los errores y vuelve a
   ejecutar los tests.
   4.2.1. Si tras 5 iteraciones los tests siguen fallando, el agente informa al usuario del bloqueo con el detalle
   del error, sin modificar los tests existentes.
5. El agente se pone en contacto con el usuario solo cuando el requerimiento ha sido completamente resuelto o si
   necesita información adicional para continuar.
6. El proceso se repite para cada nuevo requerimiento o cambio solicitado por el usuario, asegurando que cada tarea
   se complete de manera eficiente y efectiva.

Los tests sirven, a su vez, para documentar el código. Son la fuente de verdad para el código: si los tests pasan,
el código es correcto. Si los tests fallan, el código es incorrecto. Esto garantiza que el código siempre esté
alineado con los requerimientos del usuario y que cualquier cambio o adición se realice de manera
controlada y verificable.

Este flujo de trabajo asegura una comunicación clara y efectiva entre el usuario y los agentes del IDE, permitiendo
una colaboración eficiente para resolver problemas y cumplir con los requerimientos de manera satisfactoria.

## Resumen ejecutivo

1. El usuario solo expresa requerimientos o necesidades en el chat.
2. El agente es responsable de analizar, procesar y resolver los requerimientos, incluyendo la creación y ejecución de
   tests para verificar su cumplimiento, así como el mantenimiento del historial de requerimientos.
3. El agente es responsable de implementar el código necesario para cumplir con los requerimientos, basándose en los
   tests como fuente de verdad para el código.
4. El agente solo se pone en contacto con el usuario cuando el requerimiento ha sido completamente resuelto o si
   necesita información adicional para continuar, evitando interrupciones innecesarias y asegurando una comunicación
   eficiente y efectiva.

## Reglas estrictas para los agentes de IA

- Los tests no se modifican para hacerlos pasar. Si los tests fallan, el agente debe corregir el código para que los
  tests pasen. Si tras 5 iteraciones los tests siguen fallando, el agente informa al usuario del bloqueo con el detalle
  del error, sin modificar los tests existentes.
- La modificación de los tests solo es legítima cuando no están respondiendo a los requerimientos del usuario o cuando
  los requerimientos del usuario han cambiado. En este último caso, el agente debe actualizar el historial de
  requerimientos con los nuevos requerimientos antes de modificar los tests, pero no debe modificar los requerimientos
  anteriores.
- La modificación de los tests para que pasen, contradiciendo los requerimientos del usuario, es una violación grave
  de las reglas y no es tolerada.
- El agente implementa el código para que cumpla con los tests, y los tests para que cumplan con los requerimientos
  del usuario.
- El agente NO realiza commits de forma autónoma.
- El agente sugiere un mensaje de commit cada vez que habla con el usuario y hay cambios, y pide autorización para efectuarlo.
- El agente SOLO realiza commits cuando el usuario lo autoriza.

## Reglas estrictas para el usuario

- El usuario solo expresa requerimientos o necesidades en el chat.
- El usuario no modifica los tests.
- El usuario no modifica el historial de requerimientos.
- El usuario no modifica `REQUIREMENTS.md` ni `WORKFLOW.md`.
- El usuario no modifica el código.

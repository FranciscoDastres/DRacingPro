# UI/UX

## Paleta propuesta

| Token            |      Dark |     Light | Uso                              |
| ---------------- | --------: | --------: | -------------------------------- |
| `background`     | `#080B10` | `#F6F7F9` | Fondo general                    |
| `surface`        | `#111722` | `#FFFFFF` | Cards y paneles                  |
| `surface-raised` | `#1A2330` | `#E9EDF2` | Elementos elevados               |
| `text`           | `#F4F7FA` | `#111722` | Texto principal                  |
| `text-muted`     | `#9AA6B2` | `#586474` | Texto secundario                 |
| `primary`        | `#F04438` | `#D92D20` | Acción principal, energía racing |
| `accent`         | `#27D3C2` | `#087F74` | Disponibilidad y foco de marca   |
| `warning`        | `#FDB022` | `#B54708` | Atención/espera                  |
| `success`        | `#32D583` | `#027A48` | Confirmado/completado            |
| `danger`         | `#FF6B6B` | `#B42318` | Error/cancelación                |

El grafito reduce fatiga visual y remite al entorno mecánico. El rojo comunica
velocidad y sirve como gesto visual racing; el turquesa separa acciones de agenda
y disponibilidad sin competir con estados de error. No se depende solo del color:
todos los estados llevan icono y texto. Las combinaciones finales deben superar
WCAG AA (4.5:1 para texto normal) en ambos temas.

## Principios de interacción

- Agendamiento en cuatro pasos: moto, servicios, fecha/hora, confirmación.
- Resumen de precio/duración persistente; no esconder costes hasta el final.
- Mostrar fechas en la zona del taller y confirmar explícitamente el horario.
- Timeline de la moto con última actualización destacada y sello de hora.
- Panel admin orientado a agenda diaria, con filtros y acciones por estado.
- Mobile-first para clientes; desktop denso pero accesible para operación interna.
- Skeletons para carga, estados vacíos útiles y errores recuperables sin perder el
  formulario.

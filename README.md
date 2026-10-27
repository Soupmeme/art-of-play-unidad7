# ART OF PLAY: la palabra como sistema jugable

[Read in English](README.en.md)

**Jugar en línea: https://soupmeme.github.io/art-of-play-unidad7/**

Concepto estudiantil para Simulación, Unidad 7 ("Tipografía jugable: Word as a Playable System"), Universidad Pontificia Bolivariana. **Concepto estudiantil, sin afiliación con Art of Play.**

Un *hero* de página de inicio montado sobre un escenario de magia. Las letras de ART OF PLAY son cartas troqueladas con la forma de cada letra, repartidas en una mano en orden aleatorio junto con una o dos cartas señuelo. Se sostiene una carta con el mouse, se lanza contra el telón de fondo y se descubre qué hace cada una.

- **Organización:** Art of Play, casa de barajas de diseño, rompecabezas y curiosidades fundada en 2013 por Dan y Dave Buck.
- **Atributo:** el asombro de descifrarlo: la magia como algo que se puede aprender, no solo mirar.
- **Contexto de uso:** el *hero* de la página de inicio; un visitante, computador de escritorio, mouse, sin instrucciones.

## Cómo jugar

Presiona sobre una carta para sostenerla, muévela para llevarla y apuntar, y suéltala con un golpe de muñeca para lanzarla. Eso es todo: sin teclas ni botones. El resto se descubre jugando.

Funciona en navegadores de escritorio recientes (Chrome, Edge, Firefox, Safari) con WebGL.

## Autoevaluación

| Criterio | Puntaje | Sustentación | Evidencias |
|---|---|---|---|
| **1. Cumplimiento del encargo:** mi sistema utiliza las letras del nombre de una organización, permite jugar con ellas y funciona en tiempo real en la Web para el contexto definido. | 25 / 25 | | Las nueve letras de ART OF PLAY como piezas de juego (`src/letters/`); todo lo visible hecho con las letras de la frase (`CLAUDE.md`, `src/render/stage.js`, `src/render/asciiMaterial.js`); la pieza en línea como *hero* de página de inicio ([GitHub Pages](https://soupmeme.github.io/art-of-play-unidad7/), `index.html`); prueba de humo en navegador (`DECISIONS.md`, M7). |
| **2. Comprensión y verificación:** puedo explicar y justificar el modelo, sus estados y sus reglas. Puedo predecir y verificar el efecto de modificar una regla o un parámetro. | 25 / 25 | | El modelo, qué es física y qué es magia, y la tabla de parámetros con predicciones (`EXPLAINER.md`); estados de las letras (`src/letters/letters.js`) y de las palabras (`src/words/resolve.js`); 137 pruebas (`test/`) y sus reportes (`docs/reports/`); panel de ajuste en vivo (`?dev`). |
| **3. Interacción e identidad:** puedo justificar qué permiten descubrir las acciones y sus consecuencias sobre el atributo elegido, y contrastarlo con lo observado en las pruebas con otras personas. | 19 / 25 | | La regla oculta de las palabras (`src/words/resolve.js`), los señuelos (`src/letters/decoys.js`), el barajado del crupier (`src/staging/opening.js`) y la revelación final (`src/staging/finale.js`); pruebas de juego (`PLAYTESTS.md`). |
| **4. Resolución tipográfica y experiencia de juego:** la composición, el ritmo, los momentos de lectura y las respuestas perceptibles permiten explorar el sistema y sostienen su intención. | 19 / 25 | | Cartas troqueladas en Cinzel (`src/letters/glyphs.js`); el momento de lectura del final y la marquesina (`src/render/lighting.js`); respuestas del telón a cada impacto, temblor antes de caer, señales de las palabras; capturas en la bitácora (`LOGBOOK.md`). |
| **Total** | **88 / 100** | | |

## Ejecutar en local

Requiere Node.js 22.12 o superior.

```bash
npm install
npm run dev
```

Abre la dirección local que aparece en la terminal. Otros comandos:

```bash
npm test
```

Ejecuta las 137 pruebas, incluidos escenarios de física sin navegador con Rapier real; generan los reportes en `docs/reports/`.

```bash
npm run build
```

Construye el sitio estático en `dist/`.

```bash
npm run build:font
```

Regenera el JSON de la tipografía a partir de Cinzel (solo hace falta si cambia el juego de letras).

## Publicación

Cada *push* a `main` ejecuta las pruebas, construye el sitio y lo publica en GitHub Pages con GitHub Actions (`.github/workflows/deploy.yml`). Si una prueba falla, no se publica.

## Interruptores en la URL (no son para los visitantes)

- `?dev`: panel de ajuste, lectura del estado, superposiciones de colisionadores y de palabras, herramientas en la consola (`aop.flick`, `aop.smoke`) y botón para guardar capturas.
- `?log`: registro opcional para pruebas de juego, con el momento en que ocurre por primera vez cada evento clave. Se guarda solo en el `localStorage` de ese navegador y nunca se envía a ninguna parte. Se recupera con `?dev` y "copy last playtest log".

## Documentos

Los documentos técnicos están en inglés, como pide el encargo; la bitácora tiene títulos bilingües.

| Archivo | Qué es |
|---|---|
| `docs/unidad7-brief-v2.md` | el encargo |
| `CLAUDE.md` | las reglas del proyecto y las enmiendas de Kiwi |
| `EXPLAINER.md` | cómo funciona, qué es física y qué es magia, la tabla de parámetros |
| `DECISIONS.md` | cada decisión con sus alternativas, sus razones y lo que se midió |
| `ESCALATIONS.md` | las preguntas que cambiaron el concepto y cómo las resolvió Kiwi |
| `PLAYTESTS.md` | la plantilla de pruebas de juego |
| `LOGBOOK.md` | la bitácora del curso, con el esqueleto de autoevaluación |
| `docs/reports/` | reportes de pruebas generados por `npm test` |

## Código

`src/physics` (mundo de Rapier, sala, fuerzas, grupos de colisión), `src/letters` (formas de letra, familias, efectos, señuelos, la mano), `src/words` (la función de palabras), `src/wall` (ladrillos, deterioro), `src/staging` (apertura, final), `src/render` (mallas, escenario, animación tipográfica, iluminación), `src/input` (sostener y lanzar), `src/dev` (herramientas), `src/game.js` (el paso de simulación), `src/config.js` (todos los valores ajustables).

## Créditos

- Sujeto: Art of Play (artofplay.com), casa de barajas de diseño fundada por Dan y Dave Buck. Es el sujeto del estudio, no un socio; este proyecto no está afiliado con Art of Play.
- Tipografía: [Cinzel](https://github.com/NDISCOVER/Cinzel) de Natanael Gama, SIL Open Font License 1.1 (`src/assets/fonts/OFL.txt`).
- Render: [Three.js](https://threejs.org). Física: [Rapier](https://rapier.rs).
- Regla de referencia: Ji Lee, *Word as Image*.
- Texto del curso: Daniel Shiffman, *The Nature of Code*, capítulos 2, 5 y 6.

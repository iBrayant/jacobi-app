# Método de Jacobi

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)

Calculadora web del **método iterativo de Jacobi** para resolver sistemas de ecuaciones lineales `Ax = b`. Ingresas la matriz, el vector de términos independientes, la tolerancia y el máximo de iteraciones, y la app muestra la solución, la tabla de iteraciones y la gráfica de convergencia del error.

> Proyecto académico — Ingeniería de Sistemas y Computación, Universidad de Cundinamarca.

<!-- TODO: captura o GIF de la app (guardar en docs/img/) -->
<!-- ![Demo](docs/img/demo.png) -->
<!-- TODO: enlace a la demo desplegada en Vercel -->

## Características

- **Sistemas de tamaño variable:** elige la dimensión `n × n` y edita la matriz `A` y el vector `b` en una cuadrícula interactiva.
- **Verificación de diagonal dominante:** avisa si la matriz no es estrictamente diagonal dominante, condición que garantiza la convergencia.
- **Tabla de iteraciones** con el vector `x` y el error de cada paso.
- **Gráfica de convergencia** del error por iteración (Recharts).
- **Fórmulas en LaTeX** renderizadas con KaTeX.
- **Manejo de errores:** valida entradas no numéricas, tolerancia o iteraciones inválidas, ceros en la diagonal principal y falta de convergencia.
- **Lógica separada de la interfaz:** el algoritmo vive en `src/math/jacobi.ts`, comentado paso a paso.

## El método

Para cada incógnita se despeja su ecuación usando **solo los valores de la iteración anterior**, a diferencia de Gauss-Seidel:

```
x_i^(k+1) = ( b_i − Σ_{j≠i} a_ij · x_j^(k) ) / a_ii
```

El error relativo se calcula con la norma infinito:

```
ε = max|x^(k+1) − x^(k)| / max|x^(k+1)|
```

La iteración arranca en el vector cero y se detiene cuando `ε` es menor que la tolerancia o se alcanza el máximo de iteraciones.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · KaTeX · Recharts · math.js · Lucide

## Estructura

```
src/
├── app/page.tsx      -> interfaz: matriz, parámetros, tabla y gráfica
└── math/jacobi.ts    -> algoritmo de Jacobi (sin dependencias de React)
```

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Para compilar: `npm run build && npm start`.

## Ejemplo

El sistema que carga la app por defecto:

```
 10x + 2y −  z =  27
 −3x − 6y + 2z = −61.5
   x +  y + 5z = −21.5
```

es diagonal dominante y converge a `x = 0.5`, `y = 8`, `z = −6`.

## Autor

**Brayant Vásquez Gómez** · [GitHub](https://github.com/iBrayant) · [LinkedIn](https://www.linkedin.com/in/brayant-v%C3%A1squez-g%C3%B3mez-4b483a1a1)

Licencia [MIT](LICENSE).

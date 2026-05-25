export interface IterationData {
  k: number;
  x: number[];
  error: number | null;
}

export interface JacobiResult {
  hasConverged: boolean;
  solution: number[] | null;
  results: IterationData[];
  errorMsg: string;
  warningMsg: string;
}

/**
 * Módulo para resolver sistemas de ecuaciones lineales mediante el Método de Jacobi.
 * 
 * Requiere una matriz de coeficientes A y un vector de términos independientes b.
 * La convergencia está garantizada si la matriz es Estrictamente Diagonal Dominante (EDD).
 */
export function calculateJacobi(
  matrixStrings: string[][],
  vectorStrings: string[],
  tolString: string,
  maxIterString: string
): JacobiResult {

  let hasConverged = false;
  let solution: number[] | null = null;
  const iterData: IterationData[] = [];
  let errorMsg = "";
  let warningMsg = "";

  try {
    const n = matrixStrings.length;

    // --- PASO 1: Conversión y Validación de Entradas ---
    const A = matrixStrings.map(row => row.map(val => parseFloat(val)));
    const b = vectorStrings.map(val => parseFloat(val));
    const tolerance = parseFloat(tolString);
    const maxI = parseInt(maxIterString);

    if (A.some(row => row.some(val => isNaN(val))) || b.some(val => isNaN(val))) {
      throw new Error("La matriz y el vector deben contener valores numéricos válidos.");
    }
    if (isNaN(tolerance) || tolerance <= 0) {
      throw new Error("La tolerancia debe ser un número positivo.");
    }
    if (isNaN(maxI) || maxI <= 0) {
      throw new Error("El máximo de iteraciones debe ser un entero positivo.");
    }

    // --- PASO 2: Verificación de la Matriz (Diagonal Dominante) ---
    // Chequeamos si el valor absoluto del elemento en la diagonal es mayor a la suma
    // del resto de valores absolutos en la misma fila.
    let isDominant = true;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) sum += Math.abs(A[i][j]); 
      }
      if (Math.abs(A[i][i]) <= sum) {
        isDominant = false;
        // Si la diagonal es cero, no se puede hacer la división en la fórmula
        if (A[i][i] === 0) {
          throw new Error(`El elemento en la diagonal principal A[${i + 1}][${i + 1}] es 0. El método no se puede aplicar.`);
        }
      }
    }

    if (!isDominant) {
      warningMsg = "Advertencia: La matriz no es estrictamente diagonal dominante. El método puede no converger.";
    }

    // --- PASO 3: Inicialización ---
    // Empezamos asumiendo que el vector solución inicial es cero.
    let x_old = Array(n).fill(0);
    let k = 0;
    
    iterData.push({ k: 0, x: [...x_old], error: null });

    let currentError = 100;
    let x_new = Array(n).fill(0);

    // --- PASO 4: Ciclo Iterativo ---
    do {
      k++;

      // A diferencia de Gauss-Seidel, Jacobi utiliza estricta y únicamente los valores de 
      // la iteración anterior (x_old) para calcular todos los nuevos x_new.
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          if (i !== j) sum += A[i][j] * x_old[j]; 
        }
        // Aplicamos la fórmula central de Jacobi
        x_new[i] = (b[i] - sum) / A[i][i];
      }

      // --- PASO 5: Cálculo del Error y Criterio de Parada ---
      // Calculamos el error relativo utilizando la norma infinito
      let maxDiff = 0;
      let maxNew = 0;
      for (let i = 0; i < n; i++) {
        let diff = Math.abs(x_new[i] - x_old[i]);
        if (diff > maxDiff) maxDiff = diff;
        let absNew = Math.abs(x_new[i]);
        if (absNew > maxNew) maxNew = absNew;
      }

      currentError = maxNew === 0 ? 0 : maxDiff / maxNew;

      // Desplazamiento de los vectores para la próxima iteración
      x_old = [...x_new];

      iterData.push({ k: k, x: [...x_old], error: currentError });

      // Verificamos si alcanzamos la tolerancia pedida
      if (currentError < tolerance) {
        hasConverged = true;
        break;
      }

    } while (k < maxI);

    // --- PASO 6: Resultados Finales ---
    if (hasConverged) {
      solution = [...x_old];
    } else {
      errorMsg = "No converge: Se alcanzó el número máximo de iteraciones.";
    }

  } catch (err: any) {
    errorMsg = err.message || "Error al calcular el método.";
  }

  return {
    hasConverged,
    solution,
    results: iterData,
    errorMsg,
    warningMsg
  };
}

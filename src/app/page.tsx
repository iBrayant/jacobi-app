"use client";

// Importaciones
// - useState: para recordar los valores del formulario y los resultados.
// - react-katex: para mostrar fórmulas matemáticas bonitas (como en LaTeX).
// - recharts: librería para dibujar la gráfica de convergencia del error.
// - lucide-react: íconos visuales para la interfaz.

import { useState } from "react";
import { BlockMath, InlineMath } from "react-katex";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, RefreshCw, Grid3X3, AlertTriangle } from "lucide-react";

// IterationData
// Define cómo luce cada fila de la tabla de resultados:
// - k: número de iteración
// - x: el vector solución en esa iteración (todos los valores x1, x2, x3...)
// - error: qué tan lejos estamos de la solución real (null en la iteración 0)

interface IterationData {
  k: number;
  x: number[];
  error: number | null;
}

export default function JacobiMethodApp() {

  // VARIABLES DE ESTADO — ENTRADAS DEL USUARIO
  // n: tamaño del sistema (cuántas ecuaciones / incógnitas tiene)
  // matrix: la matriz A con los coeficientes del sistema (como tabla de texto)
  // vector: el vector b con los términos independientes
  // tol: tolerancia para saber cuándo parar
  // maxIter: límite de iteraciones para evitar bucles infinitos

  const [n, setN] = useState(3);
  const [matrix, setMatrix] = useState<string[][]>([
    ["10", "2", "-1"],
    ["-3", "-6", "2"],
    ["1", "1", "5"]
  ]);
  const [vector, setVector] = useState<string[]>(["27", "-61.5", "-21.5"]);
  const [tol, setTol] = useState("0.0001");
  const [maxIter, setMaxIter] = useState("50");

  // VARIABLES DE ESTADO — RESULTADOS
  // results: lista de todas las iteraciones (para la tabla)
  // solution: el vector solución final encontrado
  // errorMsg: si algo sale mal, aquí guardamos el mensaje
  // warningMsg: advertencia cuando la matriz no es diagonal dominante
  // hasCalculated: controla si ya se hizo algún cálculo (para mostrar/ocultar paneles)
  // converged: indica si el método llegó a la solución con la precisión pedida

  const [results, setResults] = useState<IterationData[]>([]);
  const [solution, setSolution] = useState<number[] | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [hasCalculated, setHasCalculated] = useState(false);
  const [converged, setConverged] = useState(false);

  // MANEJADOR: handleSizeChange
  // Se activa cuando el usuario cambia el tamaño del sistema (n).
  // Reconstruye la matriz y el vector respetando los valores ya ingresados,
  // y rellena con "0" las nuevas celdas que se agreguen.
  // Se limita entre 2 y 10 para mantener la app manejable.

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newN = parseInt(e.target.value);
    if (isNaN(newN)) return;
    if (newN < 2) newN = 2;
    if (newN > 10) newN = 10;
    setN(newN);
    setMatrix(prev => {
      return Array.from({ length: newN }, (_, i) =>
        Array.from({ length: newN }, (_, j) => (prev[i] && prev[i][j] !== undefined ? prev[i][j] : "0"))
      );
    });
    setVector(prev => Array.from({ length: newN }, (_, i) => (prev[i] !== undefined ? prev[i] : "0")));
  };

  // MANEJADOR: handleMatrixChange
  // Se activa cuando el usuario edita una celda de la matriz A.
  // Actualiza solo esa celda específica sin borrar el resto de la matriz.

  const handleMatrixChange = (i: number, j: number, val: string) => {
    const newMat = [...matrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    setMatrix(newMat);
  };

  // MANEJADOR: handleVectorChange
  // Se activa cuando el usuario edita una celda del vector b.
  // Funciona igual que handleMatrixChange pero para el vector columna.

  const handleVectorChange = (i: number, val: string) => {
    const newVec = [...vector];
    newVec[i] = val;
    setVector(newVec);
  };

  // FUNCIÓN PRINCIPAL: calculate
  // Se ejecuta al presionar "Calcular Método". Implementa el Método de Jacobi
  // en cuatro grandes etapas:
  //   1. Convertir y validar las entradas
  //   2. Verificar si la matriz es diagonal dominante
  //   3. Ejecutar el ciclo iterativo de Jacobi
  //   4. Publicar los resultados en pantalla

  const calculate = (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página se recargue al enviar el formulario

    // Limpiamos resultados anteriores antes de calcular de nuevo
    setErrorMsg("");
    setWarningMsg("");
    setResults([]);
    setSolution(null);
    setHasCalculated(true);
    setConverged(false);

    try {

      // PASO 1: Convertir entradas de texto a números reales
      // Los campos del formulario siempre devuelven texto (strings).
      // Los convertimos a números para poder hacer operaciones matemáticas.
      const A = matrix.map(row => row.map(val => parseFloat(val))); // Matriz A como números
      const b = vector.map(val => parseFloat(val));                  // Vector b como números
      const tolerance = parseFloat(tol);
      const maxI = parseInt(maxIter);

      // Validamos que todos los valores sean números válidos
      if (A.some(row => row.some(val => isNaN(val))) || b.some(val => isNaN(val))) {
        throw new Error("La matriz y el vector deben contener valores numéricos válidos.");
      }
      if (isNaN(tolerance) || tolerance <= 0) {
        throw new Error("La tolerancia debe ser un número positivo.");
      }
      if (isNaN(maxI) || maxI <= 0) {
        throw new Error("El máximo de iteraciones debe ser un entero positivo.");
      }

      // PASO 2: Verificar si la matriz es diagonal dominante
      // El Método de Jacobi garantiza convergencia cuando la matriz es
      // "estrictamente diagonal dominante": esto significa que el valor
      // absoluto del elemento diagonal de cada fila debe ser MAYOR que la
      // suma de los valores absolutos del resto de elementos en esa fila.
      // Si no se cumple, el método puede igualmente funcionar, pero lo
      // advertimos al usuario con un mensaje en amarillo.
      // Además, si algún elemento diagonal es 0, el método es imposible
      // (dividiríamos entre cero en la fórmula), así que lanzamos un error.
      let isDominant = true;
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          if (i !== j) sum += Math.abs(A[i][j]); // Suma de los elementos fuera de la diagonal
        }
        if (Math.abs(A[i][i]) <= sum) {
          isDominant = false;
          if (A[i][i] === 0) {
            throw new Error(`El elemento en la diagonal principal A[${i + 1}][${i + 1}] es 0. El método de Jacobi no se puede aplicar.`);
          }
        }
      }

      if (!isDominant) {
        setWarningMsg("Advertencia: La matriz no es estrictamente diagonal dominante. El método puede no converger.");
      }

      //PASO 3: Ciclo iterativo del Método de Jacobi
      // El método empieza con una suposición inicial: x = [0, 0, 0, ...]
      // Luego aplica repetidamente la fórmula de Jacobi para refinar la solución.
      // Es decir: para calcular cada nueva x_i, usamos TODOS los valores
      // de la iteración ANTERIOR. Esto es lo que diferencia a Jacobi de
      // Gauss-Seidel (que usa valores mezclados del paso actual y anterior).

      let x_old = Array(n).fill(0); // Vector inicial: todas las incógnitas valen 0
      let k = 0;
      let iterData: IterationData[] = [];

      // Guardamos la iteración 0 (el punto de partida) en la tabla
      iterData.push({ k: 0, x: [...x_old], error: null });

      let currentError = 100; // Error inicial grande para que el ciclo arranque
      let hasConverged = false;
      let x_new = Array(n).fill(0); // Vector donde guardamos los nuevos valores calculados

      do {
        k++;

        // Calculamos todos los nuevos x_i usando los valores del paso anterior (x_old)
        for (let i = 0; i < n; i++) {
          let sum = 0;
          for (let j = 0; j < n; j++) {
            if (i !== j) sum += A[i][j] * x_old[j]; // Suma de los términos que NO son la diagonal
          }
          // Aplicamos la fórmula de Jacobi para obtener el nuevo x_i
          x_new[i] = (b[i] - sum) / A[i][i];
        }

        // Calcular error
        // Usamos el error relativo: cuánto cambió la solución en esta iteración
        // comparado con el valor más grande del nuevo vector.
        // Esto normaliza el error sin importar la magnitud de los números.
        let maxDiff = 0; // La diferencia más grande entre x_new y x_old
        let maxNew = 0;  // El valor más grande en x_new (para normalizar)
        for (let i = 0; i < n; i++) {
          let diff = Math.abs(x_new[i] - x_old[i]);
          if (diff > maxDiff) maxDiff = diff;
          let absNew = Math.abs(x_new[i]);
          if (absNew > maxNew) maxNew = absNew;
        }

        currentError = maxNew === 0 ? 0 : maxDiff / maxNew; // Error relativo

        // El vector nuevo se convierte en el viejo para la próxima iteración
        x_old = [...x_new];

        // Guardamos esta iteración en la tabla de resultados
        iterData.push({ k: k, x: [...x_old], error: currentError });

        // Si el error ya es menor que la tolerancia pedida, convergimos → paramos.
        if (currentError < tolerance) {
          hasConverged = true;
          break;
        }

      } while (k < maxI); // Si no convergió, seguimos hasta el máximo de iteraciones

      // PASO 4: Publicar los resultados
      setResults(iterData); // Enviamos la tabla completa de iteraciones

      if (hasConverged) {
        setConverged(true);
        setSolution([...x_old]); // Guardamos la solución final encontrada
      } else {
        // Se agotaron las iteraciones sin alcanzar la tolerancia
        setErrorMsg("No converge: Se alcanzó el número máximo de iteraciones.");
      }

    } catch (err: any) {
      // Capturamos cualquier error de validación o cálculo y lo mostramos al usuario
      setErrorMsg(err.message || "Error al calcular el método.");
    }
  };

  // Gráfica
  // Filtramos la iteración 0 (que no tiene error) y preparamos los datos
  // en el formato que necesita recharts para dibujar la curva de convergencia.
  // La gráfica muestra visualmente cómo el error disminuye con cada iteración.

  const chartData = results.filter(r => r.error !== null).map(r => ({
    k: r.k,
    error: r.error
  }));


  // INTERFAZ DE USUARIO
  // React redibuja esta sección automáticamente cada vez que cambia
  // alguna variable de estado. Se divide en dos paneles:

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-12">
      <header className="bg-white border-b border-stone-200 shadow-sm py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-3">
          <Grid3X3 className="text-orange-600" size={28} />
          <h1 className="text-2xl font-bold text-stone-800">
            Método de Jacobi
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ── PANEL IZQUIERDO: Formulario de entrada ── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <h2 className="text-lg font-semibold mb-4 text-stone-800">Parámetros del Sistema</h2>
            <form onSubmit={calculate} className="space-y-6">

              {/* Campo para el tamaño del sistema n×n */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Dimensión de la matriz (<InlineMath math="n \times n" />)
                </label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={n}
                  onChange={handleSizeChange}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  required
                />
              </div>

              {/* Cuadrícula interactiva para ingresar la matriz A y el vector b */}
              <div className="overflow-x-auto pb-2">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Matriz <InlineMath math="A" /> y Vector <InlineMath math="b" />
                </label>
                <div className="flex gap-4 items-center min-w-max">

                  {/* Matriz A: cada celda es un input editable */}
                  <div className="border-l-2 border-r-2 border-stone-800 px-2 flex flex-col gap-2">
                    {matrix.map((row, i) => (
                      <div key={`row-${i}`} className="flex gap-2">
                        {row.map((val, j) => (
                          <input
                            key={`cell-${i}-${j}`}
                            type="text"
                            value={val}
                            onChange={(e) => handleMatrixChange(i, j, e.target.value)}
                            className="w-16 text-center px-1 py-1.5 border border-stone-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                            required
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="text-xl font-bold text-stone-400">
                    <InlineMath math="\vec{x} =" />
                  </div>

                  {/* Vector b: columna de inputs con fondo naranja para diferenciarlo */}
                  <div className="border-l-2 border-r-2 border-stone-800 px-2 flex flex-col gap-2">
                    {vector.map((val, i) => (
                      <input
                        key={`vec-${i}`}
                        type="text"
                        value={val}
                        onChange={(e) => handleVectorChange(i, e.target.value)}
                        className="w-16 text-center px-1 py-1.5 border border-stone-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm bg-orange-50"
                        required
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Campos de tolerancia e iteraciones máximas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Tolerancia (<InlineMath math="\text{tol}" />)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={tol}
                    onChange={(e) => setTol(e.target.value)}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Iteraciones máx.
                  </label>
                  <input
                    type="number"
                    value={maxIter}
                    onChange={(e) => setMaxIter(e.target.value)}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Botón que dispara el cálculo */}
              <button
                type="submit"
                className="w-full mt-4 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                <RefreshCw size={18} />
                Calcular Método
              </button>
            </form>
          </div>

          {/* Tarjeta que muestra la fórmula de Jacobi en formato matemático */}
          <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
            <h3 className="text-sm font-semibold text-orange-900 mb-3 uppercase tracking-wider">Fórmula de Iteración</h3>
            <div className="text-center overflow-x-auto py-2">
              <BlockMath math="x_i^{(k)} = \frac{1}{a_{ii}} \left( b_i - \sum_{j \neq i} a_{ij} x_j^{(k-1)} \right)" />
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO: Resultados ── */}
        <div className="lg:col-span-7 space-y-6">

          {/* Advertencia amarilla: la matriz no es diagonal dominante */}
          {warningMsg && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" size={20} />
              <p>{warningMsg}</p>
            </div>
          )}

          {/* Error rojo: algo salió mal (ceros en diagonal, valores inválidos, etc.) */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Estado vacío: se muestra antes de que el usuario calcule algo */}
          {!hasCalculated && !errorMsg && (
            <div className="bg-white border border-stone-200 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center text-stone-400">
              <Grid3X3 size={48} className="mb-4 opacity-50" />
              <p className="text-lg">Ingresa los parámetros y presiona Calcular</p>
            </div>
          )}

          {/* Banner verde de éxito con los valores de la solución x1, x2, x3... */}
          {hasCalculated && solution !== null && converged && (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <h3 className="text-emerald-800 font-semibold mb-1">Converge ✓</h3>
                <p className="text-emerald-600 text-sm">El método encontró la solución exitosamente.</p>
              </div>
              {/* Mostramos cada componente del vector solución */}
              <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-emerald-100 flex gap-4 overflow-x-auto max-w-full">
                {solution.map((val, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-xs text-stone-500 font-medium">x{i + 1}</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {val.toFixed(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla de iteraciones: muestra k, los valores x en cada paso, y el error */}
          {results.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-5 border-b border-stone-100 bg-stone-50/50">
                <h3 className="font-semibold text-stone-800">Tabla de Iteraciones</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-stone-500 uppercase bg-stone-50">
                    <tr>
                      <th className="px-6 py-3 font-medium">k</th>
                      {/* Generamos dinámicamente los encabezados x1, x2, x3... según n */}
                      {Array.from({ length: n }).map((_, i) => (
                        <th key={`th-${i}`} className="px-6 py-3 font-medium"><InlineMath math={`x_${i + 1}`} /></th>
                      ))}
                      <th className="px-6 py-3 font-medium">Error máx.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {/* Recorremos la lista de iteraciones y generamos una fila por cada una */}
                    {results.map((r) => (
                      <tr key={r.k} className="hover:bg-stone-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-stone-900">{r.k}</td>
                        {r.x.map((val, i) => (
                          <td key={`td-${r.k}-${i}`} className="px-6 py-4 font-mono">{val.toFixed(6)}</td>
                        ))}
                        {/* En la iteración 0 no hay error calculado aún, mostramos "-" */}
                        <td className="px-6 py-4 font-mono">
                          {r.error === null ? "-" : r.error.toExponential(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gráfica de convergencia: muestra cómo el error cae con cada iteración.
              Solo se dibuja si hay al menos 2 puntos de datos con error calculado. */}
          {chartData.length > 1 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
              <h3 className="font-semibold text-stone-800 mb-6">Convergencia del Error</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="k"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      allowDecimals={false}
                    />
                    {/* El eje Y muestra los errores en notación científica para legibilidad */}
                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => val.toExponential(1)}
                    />
                    <Tooltip
                      formatter={(value: any) => typeof value === 'number' ? value.toExponential(4) : value}
                      labelFormatter={(label: any) => `Iteración k = ${label}`}
                    />
                    {/* Línea naranja que traza la curva del error a lo largo de las iteraciones */}
                    <Line
                      type="monotone"
                      dataKey="error"
                      stroke="#ea580c"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#ea580c" }}
                      name="Error"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

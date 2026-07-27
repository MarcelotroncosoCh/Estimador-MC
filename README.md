# Evaluacion economica Preliminar

Aplicacion local para estimar de forma preliminar el MC%, ingresos, costo total y terreno maximo recomendable de un proyecto habitacional, usando una base historica de proyectos.

La aplicacion esta pensada como apoyo para una primera evaluacion economica. No reemplaza la caratula final ni la revision tecnica/financiera del proyecto.

## Como abrir la aplicacion

1. Descomprime la carpeta completa, si la recibiste en archivo `.zip`.
2. Abre la carpeta `estimador-mc-inmobiliario`.
3. Haz doble clic en `ABRIR_APP.bat`.
4. Si no funciona, abre manualmente `index.html` con Google Chrome o Microsoft Edge.

Importante: no abras los archivos `.js` o `.css` directamente, porque el navegador mostrara codigo. El archivo correcto es `ABRIR_APP.bat` o `index.html`.

## Publicacion en GitHub Pages

La aplicacion puede publicarse como sitio estatico en GitHub Pages porque funciona con archivos HTML, CSS, JavaScript y datos locales.

Para publicarla:

1. Crea un repositorio en GitHub.
2. Sube el contenido completo de esta carpeta a la rama principal.
3. En GitHub, entra a `Settings` > `Pages`.
4. En `Build and deployment`, selecciona `Deploy from a branch`.
5. Elige la rama `main` y la carpeta `/root`.
6. Guarda la configuracion.

GitHub entregara un enlace similar a:

`https://usuario.github.io/nombre-del-repositorio/`

El archivo `.nojekyll` evita que GitHub Pages procese la carpeta como sitio Jekyll y ayuda a servir los archivos estaticos tal como estan.

## Tipos de proyecto disponibles

Actualmente se trabaja con:

- `DS19`
- `DS49`

La opcion inmobiliaria se dejo oculta temporalmente porque todavia esta en etapa de ajuste.

## Datos principales que debes ingresar

En la seccion `Datos del proyecto`, completa al menos:

- Nombre del proyecto.
- Region.
- Comuna.
- Tipo de proyecto.
- Tipo de vivienda.
- Total de viviendas, o casas/departamentos si es mixto.
- M2 de terreno.
- Valor terreno UF, o valor terreno UF/m2.
- Cuenta T UF, si corresponde.

Si ingresas `Valor terreno UF/m2`, la aplicacion calcula automaticamente:

`Valor terreno UF = UF/m2 * m2 terreno`

Si ingresas directamente `Valor terreno UF`, ese valor tiene prioridad.

`Cuenta T UF` se suma al valor del terreno para obtener el terreno total considerado en la evaluacion.

## Tipologias y venta

En proyectos `DS19`, debes ingresar las tipologias del proyecto:

- Tipologia.
- Cantidad de viviendas.
- Precio de venta UF por vivienda.

La aplicacion multiplica cada precio por la cantidad de viviendas y calcula los ingresos totales.

La tipologia `Local comercial` reemplaza al antiguo criterio `Sin asignar`. Si queda sin precio manual, se usa como referencia preliminar un valor medio de `975 UF`, dentro del rango historico trabajado de `850 UF` a `1100 UF`.

En proyectos `DS49`, no se ingresan ventas por tipologia, porque el ingreso viene desde el `Presupuesto financiado UF/viv`.

Por ejemplo, si el presupuesto financiado es `1900 UF/viv` y el proyecto tiene `100` viviendas, la aplicacion calcula:

`Ingreso total DS49 = 1900 * 100 = 190.000 UF`

## Supuestos opcionales

Puedes ingresar manualmente partidas como:

- Costo construccion UF.
- Instalacion de faenas UF.
- Urbanizacion UF.
- Gastos generales UF.
- Gastos financieros UF.
- Maquinaria/equipos/implementos UF.
- Honorarios UF.
- Derechos y permisos UF.
- Gastos legales UF.
- Eventualidades UF.
- Descarga Cuenta U UF.
- Activaciones UF.
- Imprevisto %.

Si dejas vacias las partidas base `Costo construccion UF`, `Instalacion de faenas UF`, `Urbanizacion UF`, `Gastos generales UF` o `Gastos financieros UF`, la aplicacion intenta estimarlas con datos historicos de proyectos similares. Las demas partidas se consideran manuales y quedan en 0 si no se ingresan.

## Como se usa la base historica

La aplicacion busca proyectos historicos similares siguiendo esta logica:

1. Mismo tipo de proyecto.
2. Misma comuna, si existe informacion.
3. Misma region, si existe informacion.
4. Cantidad de viviendas similar.
5. Historico general como respaldo si no hay coincidencias suficientes.

Para construccion, la aplicacion tambien puede usar costos historicos por tipologia, relacionados al ID del proyecto historico.

Para urbanizacion, gastos generales y gastos financieros, usa valores UF/vivienda desde proyectos similares, evitando valores vacios o cero.

## Criterios de calculo aplicados

La aplicacion calcula los resultados a partir de ingresos, costos ingresados manualmente y costos estimados desde historicos cuando faltan datos.

### Ingresos

En `DS19`, los ingresos se calculan por tipologia:

`Cantidad de viviendas * Precio de venta UF por vivienda`

Luego se suman todas las tipologias para obtener los ingresos totales.

En `DS49`, los ingresos corresponden al `Presupuesto financiado UF/viv` multiplicado por la cantidad total de viviendas, ya que no existe venta de viviendas.

### Costos

El costo total considera las partidas ingresadas o estimadas:

- Costo construccion UF.
- Instalacion de faenas UF.
- Urbanizacion UF neta.
- Gastos generales UF.
- Gastos financieros UF.
- Maquinaria/equipos/implementos UF.
- Honorarios UF.
- Derechos y permisos UF.
- Gastos legales UF.
- Eventualidades UF.
- Descarga Cuenta U UF.
- Terreno UF.
- Imprevistos UF.
- IVA costo construccion UF, cuando aplica.

`Activaciones UF` se resta de `Urbanizacion UF`, porque corresponde a recortes o traspasos de urbanizacion a otro proyecto.

### MC estimado

El MC se calcula como:

`MC% = Margen / Ingresos ajustados`

Donde el margen corresponde, de forma preliminar, a:

`Ingresos ajustados - Costo total`

En `DS19`, si existe `Credito especial UF`, este se suma al margen/ingreso ajustado segun el criterio trabajado.

## Criterios historicos cuando no se ingresan valores

Si el usuario deja vacios `Costo construccion UF`, `Urbanizacion UF`, `Gastos generales UF` o `Gastos financieros UF`, la aplicacion estima esos valores desde la base historica.

### Seleccion de proyectos historicos

Primero se buscan proyectos similares con este orden:

1. Mismo tipo de proyecto.
2. Misma comuna, si hay coincidencias.
3. Misma region, si hay coincidencias.
4. Cantidad de viviendas similar.
5. Historico general si no hay base suficiente.

### Costo construccion UF

Para `DS19`, si hay tipologias ingresadas, el costo de construccion se estima por tipologia:

`Cantidad de viviendas de la tipologia * Costo historico UF/viv de esa tipologia`

La aplicacion intenta usar primero tipologias encontradas en proyectos historicos similares. Si no encuentra coincidencias, usa el historico general de esa tipologia. Si tampoco existe un dato confiable, usa el costo construccion UF/viv promedio de proyectos similares.

Para `DS49`, aunque no hay venta por tipologia, la aplicacion revisa las viviendas construidas en proyectos DS49 historicos similares. Con esas viviendas calcula un costo UF/viv ponderado y lo multiplica por el total de viviendas del proyecto nuevo.

Como proteccion, costos por tipologia menores a `100 UF/viv` no se consideran como costo completo de construccion.

### Urbanizacion UF

Si `Urbanizacion UF` queda vacio, se usa la mediana de:

`Urbanizacion UF/viv`

tomada desde proyectos historicos similares. Luego se multiplica por el total de viviendas del proyecto simulado.

Si existen `Activaciones UF`, se restan para obtener la urbanizacion neta.

### Gastos generales UF

Si `Gastos generales UF` queda vacio, se usa la mediana de:

`Gastos generales UF/viv`

tomada desde proyectos historicos similares. Luego se multiplica por el total de viviendas.

### Gastos financieros UF

Si `Gastos financieros UF` queda vacio, se usa la mediana de:

`Gastos financieros UF/viv`

tomada desde proyectos historicos similares. Luego se multiplica por el total de viviendas.

### Ajuste historico

Cuando un valor viene desde historicos, se le puede aplicar el `Ajuste historico %`.

Este ajuste afecta los valores estimados desde historicos, pero no modifica los montos ingresados manualmente por el usuario.

## Confianza del historico

Debajo de `Supuestos usados`, veras una linea de confianza, por ejemplo:

- `Base historica fuerte: misma comuna`
- `Base historica media: misma region`
- `Base historica referencial: mismo tipo y viviendas similares`
- `Base historica limitada: historico general`

Mientras mas cercana sea la base historica, mas confiable sera la estimacion.

## Resultados

La aplicacion muestra:

- `MC estimado`: margen de contribucion estimado.
- `Ingresos UF`: ingresos o presupuesto financiado.
- `Costo total UF`: suma de costos considerados.
- `Terreno max. UF`: valor maximo sugerido de terreno para cumplir el umbral.

Criterio usado:

- MC igual o mayor a 18%: rentable.
- MC entre 15% y 17,99%: riesgoso.
- MC menor a 15%: no rentable.

## Sensibilidad

La tabla de sensibilidad muestra como cambia el MC si ocurre una variacion en algunos supuestos, por ejemplo:

- Construccion +2%.
- Urbanizacion +2%.
- Terreno +5%.
- Venta o ingreso -2%.
- Escenario conservador combinado.

Sirve para revisar si el proyecto aguanta cambios razonables en costos o ingresos.

## Proyectos similares

La tabla de proyectos similares muestra los proyectos historicos usados como referencia. Incluye:

- Proyecto.
- Tipo.
- Viviendas.
- Construccion UF/viv.
- Urbanizacion UF/viv.
- GG UF/viv.
- GF UF/viv.
- MC historico.
- Terreno UF/m2.

Esto permite revisar de donde vienen los datos historicos usados por la aplicacion.

## Guardar simulaciones

La seccion `Simulaciones guardadas` permite:

- Guardar una simulacion en el navegador.
- Cargar una simulacion guardada.
- Borrar una simulacion.
- Exportar una simulacion a archivo `.json`.
- Importar una simulacion desde archivo `.json`.

Importante: las simulaciones guardadas quedan en el navegador del computador donde se guardaron. Para compartir una simulacion con otra persona, usa `Exportar` y envia el archivo `.json`.

## Imprimir PDF

Para generar una caratula:

1. Completa o carga una simulacion.
2. Presiona `Imprimir PDF`.
3. En el dialogo del navegador, elige `Guardar como PDF`.

El PDF incluye resumen de MC, ingresos, costos principales, ingresos por tipologia y comentarios.

## Base historica

La app trae una base historica incluida en la carpeta `data`.

Tambien permite importar proyectos historicos adicionales desde archivos `.json` o `.csv`, por ejemplo exportados desde SQL Server.

Los proyectos importados:

- Se suman a la base incluida.
- No reemplazan la base original.
- Quedan guardados solo en el navegador del computador donde se importaron.

## UF actual

La UF puede funcionar de forma mixta:

- La app puede intentar actualizarla desde internet.
- Si no hay conexion o falla la actualizacion, se puede ingresar manualmente.

## Recomendaciones de uso

- Usa la app como evaluacion preliminar.
- Revisa siempre la tabla de proyectos similares.
- Si la confianza historica aparece limitada, toma el resultado con mayor cautela.
- Para una evaluacion final, valida los costos con la caratula y antecedentes reales del proyecto.

## Soporte

Desarrollado por Marcelo Troncoso.

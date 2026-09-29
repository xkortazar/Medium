# Filotaxis LED

Aplicación web interactiva (HTML + CSS + JavaScript, sin dependencias ni compilación) sobre la **filotaxis**
y una **pantalla LED audio-reactiva** con los LED colocados según el modelo de Vogel. Inspirada en el artículo
[“Phyllotaxis: An audio-reactive LED display”](https://jagi.studio/posts/phyllotaxis/) de Jagi Natarajan;
los textos y el código son originales.

## Secciones

1. **Qué es la filotaxis**: introducción a las espirales de girasoles y piñas.
2. **Modelo de Vogel**: `θ = n·α`, `r = c·√n`, con controles para el ángulo, el número de semillas y la animación del crecimiento.
3. **El ángulo áureo**: por qué 137,508°; comparación con las aproximaciones de Fibonacci 2/5, 3/8, 5/13…
4. **Parastiquias**: se colorean las semillas por `n mod k` para ver las 5, 8, 13, 21, 34… espirales.
5. **De semillas a píxeles**: cómo cartografiar una tira de LED direccionables sobre la espiral.
6. **Simulador audio-reactivo**: FFT en 32 bandas logarítmicas, detección de golpes y cuatro modos
   (anillos, brazos, floración y remolino). La fuente puede ser un ritmo sintetizado, el micrófono o un archivo de audio.
7. **Construcción**: notas sobre el hardware y un exportador de coordenadas (CSV, plantilla SVG en mm y cabecera C para el firmware).

## Uso

```sh
python3 -m http.server 8000
# abre http://localhost:8000
```

El micrófono necesita `localhost` o HTTPS.

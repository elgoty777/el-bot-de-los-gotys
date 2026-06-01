const urlParams = new URLSearchParams(window.location.search);
const textoGenerado = urlParams.get('texto');

const textoGeneradoElement = document.getElementById('texto-generado');
textoGeneradoElement.innerText = textoGenerado || '¡Hola!';
textoGeneradoElement.classList.add('custom-text');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const images = [
    { src: 'imagenes/1.jpg', color: '#15236e' },
    { src: 'imagenes/2.jpg', color: '#800020' },
    { src: 'imagenes/3.jpg', color: '#993366' },
    { src: 'imagenes/4.jpg', color: '#3c3c00' },
    { src: 'imagenes/5.jpg', color: '#003300' },
    { src: 'imagenes/6.png', color: '#12174f' },
    { src: 'imagenes/7.png', color: '#ffffff' },
    { src: 'imagenes/8.png', color: '#313330' },
    { src: 'imagenes/9.png', color: '#ffffff' }
];

const randomIndex = getRandomInt(0, images.length - 1);
const selectedImage = images[randomIndex];

const imageElement = document.getElementById('imagen');
imageElement.src = selectedImage.src;

const customText = document.querySelector('.custom-text');
customText.style.color = selectedImage.color;

function ajustarTamañoLetra() {
    const container = document.querySelector('.text-container');
    const texto = document.querySelector('.custom-text');

    let fontSize = 55; /* Tamaño base ajustado a 55px */
    texto.style.fontSize = fontSize + 'px';

    while (texto.scrollWidth > container.clientWidth || texto.scrollHeight > container.clientHeight) {
        fontSize--;
        texto.style.fontSize = fontSize + 'px';
    }
}

ajustarTamañoLetra();
window.addEventListener('resize', ajustarTamañoLetra);
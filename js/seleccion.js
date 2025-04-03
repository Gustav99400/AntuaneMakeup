const $context = document.querySelector("body");
const $circle = document.querySelector("#circle");
const $images = document.querySelectorAll(".gallery img");
const gallery = document.querySelector(".gallery");

let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;
let onImg = false;
let hoveringImg = null;
const easing = 0.1;
let popupOpen = false; 

$context.addEventListener("pointermove", (evt) => {
    if (popupOpen) return; 

    if (!onImg) {
        targetX = evt.clientX - $circle.getBoundingClientRect().width / 2;
        targetY = evt.clientY - $circle.getBoundingClientRect().height / 2;
    }
});

function animateCircle() {
    currentX += (targetX - currentX) * easing;
    currentY += (targetY - currentY) * easing;

    $circle.style.setProperty("--xpos", `${currentX}px`);
    $circle.style.setProperty("--ypos", `${currentY}px`);

    requestAnimationFrame(animateCircle);
}

animateCircle();

$images.forEach((img) => {
    img.addEventListener("mouseenter", () => {
        if (popupOpen) return; 

        const galleryWidth = gallery.getBoundingClientRect().width;
        const scaleFactor = galleryWidth < 750 ? 2 : 1.3;

        const imgRect = img.getBoundingClientRect();
        const finalWidth = imgRect.width * scaleFactor - 50;
        const finalHeight = imgRect.height * scaleFactor - 50;
        const translateY = -0.2 * imgRect.height;
        const imgCenterX = imgRect.left + window.scrollX + imgRect.width / 2;
        const imgCenterY = imgRect.top + window.scrollY + imgRect.height / 2 + translateY;

        targetX = imgCenterX - finalWidth / 2;
        targetY = imgCenterY - finalHeight / 2;

        if (!onImg || hoveringImg !== img) {
            $circle.style.width = `${finalWidth}px`;
            $circle.style.height = `${finalHeight}px`;
            $circle.style.borderRadius = "22px";
        }

        onImg = true;
        hoveringImg = img;
    });

    img.addEventListener("mouseleave", (evt) => {
        if (popupOpen) return; 

        if (hoveringImg === img) {
            onImg = false;
            hoveringImg = null;

            $circle.style.width = "var(--circleSize)";
            $circle.style.height = "var(--circleSize)";
            $circle.style.borderRadius = "50%";

            targetX = evt.clientX - $circle.getBoundingClientRect().width / 2;
            targetY = evt.clientY - $circle.getBoundingClientRect().height / 2;
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const images = document.querySelectorAll(".image-container img");
    const overlay = document.createElement("div");
    overlay.classList.add("overlay");
    document.body.appendChild(overlay);

    const popup = document.createElement("div");
    popup.classList.add("popup");
    document.body.appendChild(popup);

    images.forEach(img => {
        img.addEventListener("click", () => {
            const category = img.parentElement.getAttribute("data-title");
            showPopup(category);
        });
    });

    function showPopup(category) {
        popupOpen = true; 
        overlay.style.display = "block"; 

        popup.innerHTML = `
            <div class="popup-content">
                <span class="close-btn">&times;</span>
                <h2>Selecciona un estilo de ${category}</h2>
                <div class="options-container">
                    <div class="options">
                        ${getOptions(category)}
                    </div>
                </div>
            </div>
        `;
        popup.style.display = "flex";

        document.querySelector(".close-btn").addEventListener("click", closePopup);
    }

    function closePopup() {
        popup.style.display = "none";
        overlay.style.display = "none"; 
        popupOpen = false;
    }

    function getOptions(category) {
        const options = {
            "Manicura": [
                { name: "Clásica", desc: "Una manicura tradicional con esmalte regular.", price: "S/ 30", duration: "45 min", img: "/imgs/1.jpeg" },
                { name: "Francesa", desc: "Un estilo elegante con puntas blancas.", price: "S/ 40", duration: "1h", img: "/imgs/2.jpeg" },
                { name: "Gel", desc: "Duradera y brillante con esmalte en gel.", price: "S/ 50", duration: "1h 15min", img: "/imgs/3.jpeg" }
            ],
            "Maquillaje": [
                { name: "Natural", desc: "Maquillaje sutil para un look fresco.", price: "S/ 60", duration: "40 min", img: "/imgs/natural.jpg" },
                { name: "Glam", desc: "Maquillaje sofisticado y llamativo.", price: "S/ 90", duration: "1h 30min", img: "/imgs/glam.jpg" },
                { name: "Artístico", desc: "Creativo y lleno de colores.", price: "S/ 120", duration: "2h", img: "/imgs/artistico.jpg" }
            ],
            "Pestañas": [
                { name: "Volumen clásico", desc: "Look natural con extensiones sutiles.", price: "S/ 70", duration: "1h", img: "/imgs/volumen-clasico.jpg" },
                { name: "Volumen ruso", desc: "Extensiones densas y voluminosas.", price: "S/ 100", duration: "1h 45min", img: "/imgs/volumen-ruso.jpg" },
                { name: "Híbrido", desc: "Combinación de clásico y volumen.", price: "S/ 85", duration: "1h 30min", img: "/imgs/hibrido.jpg" }
            ],
            "Paquetes": [
                { name: "Básico", desc: "Incluye los servicios esenciales.", price: "S/ 150", duration: "2h", img: "/imgs/basico.jpg" },
                { name: "Premium", desc: "Un paquete más completo con extras.", price: "S/ 250", duration: "3h", img: "/imgs/premium.jpg" },
                { name: "Lujo", desc: "El paquete más exclusivo con todos los servicios.", price: "S/ 400", duration: "4h", img: "/imgs/lujo.jpg" }
            ]
        };

        setTimeout(() => {
            document.querySelectorAll(".select-btn").forEach(button => {
                button.addEventListener("click", (event) => {
                    const selectedService = {
                        name: event.target.getAttribute("data-name"),
                        price: event.target.getAttribute("data-price"),
                        duration: event.target.getAttribute("data-duration"),
                        category: event.target.getAttribute("data-category")
                    };
                    
                    localStorage.setItem("selectedService", JSON.stringify(selectedService));
                    window.location.href = "/hmtl/reserva.html"; 
                });
            });
        }, 100);
    
        return options[category].map(opt => `
            <div class="option">
                <img src="${opt.img}" alt="${opt.name}" style="width:80px; height:auto;">
                <div class="option-info">a
                    <h3>${opt.name}</h3>
                    <p>${opt.desc}</p>
                    <p><strong>Precio:</strong> ${opt.price}</p>
                    <p><strong>Duración:</strong> ${opt.duration}</p>
                    <button class="select-btn" data-name="${opt.name}" data-price="${opt.price}" data-duration="${opt.duration}" data-category="${category}">Seleccionar</button>
                </div>
            </div>
        `).join("");
    }


    

    overlay.addEventListener("click", closePopup);

    const style = document.createElement("style");
style.innerHTML = `
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        z-index: 10;
    }
    .popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
        display: none;
        flex-direction: column;
        align-items: center;
        height: 900px;
        border-radius: 8px;
        z-index: 20;
        overflow-y: auto; /* Permite el desplazamiento */
    }
    .popup-content {
        width: 100%;
        text-align: center;
    }
    .options-container {
        max-height: 300px; /* Limita la altura y permite desplazamiento interno */
        overflow-y: auto;
        width: 100%;
        padding-right: 10px;
    }
    .option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-bottom: 1px solid #ddd;
    }
    .option img {
        width: 200px !important;
        height: auto;
        border-radius: 5px;
        }
    .option-info {
        text-align: left;
    }
    .close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 24px;
        cursor: pointer;
    }   
   
    .popup::-webkit-scrollbar {
        width: 8px;
        height: 0;  
    }
    .popup::-webkit-scrollbar-thumb {
        background-color: #888;
        border-radius: 4px;
    }
    .popup::-webkit-scrollbar-thumb:hover {
        background-color: #555;
    }

    .select-btn {
    background-color:rgb(0, 0, 0);
    color: white;
    border: none;
    padding: 8px 12px;
    margin-top: 5px;
    font-size: 14px;
    cursor: pointer;
    border-radius: 5px;
    transition: background 0.3s ease;
}

.select-btn:hover {
    background-color:rgb(246, 196, 216);
}
`;
document.head.appendChild(style);

});


document.addEventListener("DOMContentLoaded", function () {
    const calendarContainer = document.querySelector(".calendar");
    const selectedService = document.getElementById("selected-service");
    const selectedPrice = document.getElementById("selected-price");
    const selectedDuration = document.getElementById("selected-duration");
    const payButton = document.getElementById("payButton");
    const whatsappButton = document.getElementById("whatsappButton");
    const popup = document.getElementById("popup");
    const closePopup = document.getElementById("closePopup");
    const calendarHeader = document.querySelector(".calendar-header h1");
    const emailInput = document.getElementById("email");
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const phoneInput = document.getElementById("phone");
    const resumen = document.getElementById("resumenCita");

    let horasOcupadasPorDia = {};



function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    Object.assign(toast.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: type === "error" ? "#e74c3c" : type === "success" ? "#2ecc71" : "#3498db",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "6px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        zIndex: 9999,
        fontSize: "14px"
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}


    const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();

    const selectedServiceData = JSON.parse(localStorage.getItem("selectedService"));
    if (selectedServiceData) {
        selectedService.textContent = `Servicio: ${selectedServiceData.name}`;
        selectedPrice.textContent = `Precio: ${selectedServiceData.price}`;
        selectedDuration.textContent = `Duración: ${selectedServiceData.duration}`;
    }

    // Función para cargar las horas reservadas desde Firebase en tiempo real
    // Función para cargar las horas reservadas desde Firebase en tiempo real
function loadReservedHours(callback) {
    database.ref("reservations").on("value", (snapshot) => {
        let reservedHours = {};

        snapshot.forEach(userSnapshot => {
            // Cada 'userSnapshot' tiene un id único y su información
            const reservation = userSnapshot.val(); // Es el objeto completo de la reserva

            // Asegúrate de acceder correctamente a la fecha y la hora
            const dateKey = reservation.date; // La fecha de la reserva
            const reservedTime = reservation.time; // La hora de la reserva

            // Verifica que dateKey y reservedTime existan
            if (dateKey && reservedTime) {
                if (!reservedHours[dateKey]) {
                    reservedHours[dateKey] = [];
                }

                reservedHours[dateKey].push(reservedTime); // Agrega la hora reservada para esa fecha
            }
        });

        console.log("Horas reservadas:", reservedHours); // Verifica la estructura final
        callback(reservedHours); // Llama al callback con las horas reservadas
    });
}


    // Función para generar el calendario con las horas ocupadas
function generateCalendar(reservedHours) {
    calendarContainer.innerHTML = "";
    const today = new Date();
    calendarHeader.textContent = `Calendario - Seleccione su fecha y haga su reservación`;

    for (let i = 0; i < 7; i++) {
        let date = new Date();
        date.setDate(today.getDate() + i);
        let dayElement = document.createElement("div");
        dayElement.classList.add("day");

        // Formatear la fecha para que sea "YYYY-MM-DD" para la comparación
        let formattedDate = date.toISOString().split("T")[0]; // Esto da "2025-04-20"
        dayElement.dataset.date = formattedDate;

        let dayOfWeek = daysOfWeek[date.getDay()];
        let dateStr = `${dayOfWeek}, ${date.getDate()} de ${months[date.getMonth()]}`;
        dayElement.innerHTML = `<strong>${dateStr}</strong>`;

        let hoursContainer = document.createElement("div");
        hoursContainer.classList.add("hours");

        let currentHour = today.getHours();
        let isToday = (i === 0);

        // Verifica si la fecha actual está ocupada
        if (reservedHours[formattedDate]) {
            reservedHours[formattedDate].forEach(reservedTime => {
                console.log(`Horas reservadas para el día: ${formattedDate}`, reservedTime);
            });
        }

        for (let h = 9; h <= 18; h++) {
            let hourElement = document.createElement("div");
            hourElement.classList.add("hour");
            let formattedHour = `${h}:00`;
            hourElement.textContent = formattedHour;
            hourElement.dataset.time = formattedHour;

            // Comparar si la hora está reservada
            if (reservedHours[formattedDate] && reservedHours[formattedDate].includes(formattedHour)) {
                hourElement.classList.add("reserved-hour");
                hourElement.textContent += " (Ocupado)";
            }

            if (isToday && h <= currentHour) {
                hourElement.classList.add("disabled-hour");
            } else {
                hourElement.addEventListener("click", selectHour);
            }

            hoursContainer.appendChild(hourElement);
        }

        dayElement.appendChild(hoursContainer);
        calendarContainer.appendChild(dayElement);
    }
}

function actualizarHorasOcupadas(snapshot) {
    const data = snapshot.val();
    horasOcupadasPorDia = {}; // Reinicia las reservas

    for (let key in data) {
        const reserva = data[key];
        const fecha = reserva.date;
        const hora = reserva.time;

        if (!horasOcupadasPorDia[fecha]) {
            horasOcupadasPorDia[fecha] = [];
        }

        horasOcupadasPorDia[fecha].push(hora);
    }

    console.log("Horas ocupadas actualizadas:", horasOcupadasPorDia);

    const fechaSeleccionada = document.getElementById("fecha").value;
    if (fechaSeleccionada) {
        mostrarHorasDisponibles(fechaSeleccionada);
    }
}



    // Función para seleccionar la hora
    function selectHour(event) {
        if (event.target.classList.contains("reserved-hour")) {
            alert("Esta hora ya está ocupada, por favor seleccione otra.");
            return;
        }

        document.querySelectorAll(".hour").forEach(el => el.classList.remove("selected-hour"));
        document.querySelectorAll(".day").forEach(el => el.classList.remove("selected-day"));

        event.target.classList.add("selected-hour");
        event.target.closest(".day").classList.add("selected-day");

        const selectedDate = event.target.closest(".day").dataset.date;
        const selectedTime = event.target.dataset.time;

        localStorage.setItem("selectedDateTime", JSON.stringify({ date: selectedDate, time: selectedTime }));

        const formattedDate = new Date(selectedDate).toLocaleDateString("es-PE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        resumen.innerHTML = `
            <p><strong>Fecha:</strong> ${formattedDate}</p>
            <p><strong>Hora:</strong> ${selectedTime}</p>
            <p><strong>Servicio:</strong> ${selectedServiceData.name}</p>
            <p><strong>Precio:</strong> ${selectedServiceData.price}</p>
            <p><strong>Duración:</strong> ${selectedServiceData.duration}</p>
        `;

        popup.style.display = "block";
        showToast("Hora seleccionada correctamente", "success");
    }

    // Validar campos del formulario
    function validateFormFields() {
        if (!emailInput.value.trim()) return "Email";
        if (!firstNameInput.value.trim()) return "Nombre";
        if (!lastNameInput.value.trim()) return "Apellido";
        if (!phoneInput.value.trim()) return "Teléfono";
        return null;
    }

    function confirmarReserva(reserva) {
        const mensaje = `
    ¿Estás seguro de registrar esta reserva?
    
    🧑‍💼 Cliente: ${reserva.firstName} ${reserva.lastName}
    📞 Teléfono: ${reserva.phone}
    📧 Correo: ${reserva.email}
    💅 Servicio: ${reserva.service}
    🗓 Fecha: ${reserva.date}
    ⏰ Hora: ${reserva.time}
    💰 Precio: S/ ${reserva.price}
    ⏳ Duración: ${reserva.duration}
    `;
    
        return confirm(mensaje);
    }

    payButton.addEventListener("click", function () {
        const email = emailInput.value;
        const firstName = firstNameInput.value;
        const lastName = lastNameInput.value;
        const phone = phoneInput.value;
        const selectedDateTime = JSON.parse(localStorage.getItem("selectedDateTime"));
    
        const missingField = validateFormFields();
        if (missingField) {
            alert(`Por favor, complete el campo: ${missingField}`);
            return;
        }
    
        if (!selectedDateTime || !selectedDateTime.date || !selectedDateTime.time) {
            alert("Por favor, seleccione una fecha y hora.");
            return;
        }
    
        const reserva = {
            service: selectedServiceData.name,
            price: selectedServiceData.price.replace(/[^\d]/g, ''),
            duration: selectedServiceData.duration,
            date: selectedDateTime.date,
            time: selectedDateTime.time,
            firstName,
            lastName,
            phone,
            email
        };
    
        if (!confirmarReserva(reserva)) {
            showToast("Reserva cancelada.", "info");
            return;
        }
    
        fetch("http://localhost:3000/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reserva),
        })
            .then(res => res.json())
            .then(data => {
                if (data.url) {
                    showToast("Redirigiendo a Stripe...", "success");
                    window.location.href = data.url;
                } else {
                    alert("No se pudo crear la sesión de pago.");
                }
            })
            .catch(error => {
                console.error("Error al conectarse con Stripe:", error);
                showToast("No se pudo conectar con Stripe. Intente nuevamente.", "error");
            });
    });
    
    // Cierre del popup por botón, escape o clic fuera
    closePopup.addEventListener("click", function () {
        popup.style.display = "none";
    });

    window.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            popup.style.display = "none";
        }
    });

    window.addEventListener("click", function (e) {
        if (e.target === popup) {
            popup.style.display = "none";
        }
    });

    window.addEventListener("load", () => {
        firebase.database().ref("reservations").on("value", (snapshot) => {
            actualizarHorasOcupadas(snapshot);
        });
    });


    showLoading();
    loadReservedHours(generateCalendar);
    hideLoading();
});

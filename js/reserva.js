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
    function loadReservedHours(callback) {
        database.ref("reservations").on("value", (snapshot) => {
            let reservedHours = {};
            snapshot.forEach(userSnapshot => {
                userSnapshot.forEach(reservationSnapshot => {
                    let reservation = reservationSnapshot.val();
                    let dateKey = reservation.date;
                    if (!reservedHours[dateKey]) {
                        reservedHours[dateKey] = [];
                    }
                    reservedHours[dateKey].push(reservation.time);
                });
            });
            console.log("Horas reservadas:", reservedHours);
            callback(reservedHours);
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
            dayElement.dataset.date = date.toISOString().split("T")[0];
            let formattedDate = `${daysOfWeek[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
            dayElement.innerHTML = `<strong>${formattedDate}</strong>`;

            let hoursContainer = document.createElement("div");
            hoursContainer.classList.add("hours");

            let currentHour = today.getHours();
            let isToday = (i === 0);
            let dateKey = date.toISOString().split("T")[0];

            for (let h = 9; h <= 18; h++) {
                let hourElement = document.createElement("div");
                hourElement.classList.add("hour");
                let formattedHour = `${h}:00`;
                hourElement.textContent = formattedHour;
                hourElement.dataset.time = formattedHour;

                // Asegúrate de que el formato de la hora en reservedHours esté bien
                if (reservedHours[dateKey]) {
                    // Elimina espacios y formatea correctamente
                    let reservedTime = reservedHours[dateKey].map(time => time.trim());
                    console.log(`Comparando ${formattedHour} con horas reservadas:`, reservedTime);  // Verificación

                    if (reservedTime.includes(formattedHour)) {
                        hourElement.classList.add("reserved-hour");
                        hourElement.textContent += " (Ocupado)";
                    }
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
    }

    // Validar campos del formulario
    function validateFormFields() {
        if (!emailInput.value.trim()) return "Email";
        if (!firstNameInput.value.trim()) return "Nombre";
        if (!lastNameInput.value.trim()) return "Apellido";
        if (!phoneInput.value.trim()) return "Teléfono";
        return null;
    }

    // Procesar pago
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

        fetch("http://localhost:3000/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                service: selectedServiceData.name,
                price: selectedServiceData.price.replace(/[^\d]/g, ''),
                duration: selectedServiceData.duration,
                date: selectedDateTime.date,
                time: selectedDateTime.time,
                firstName,
                lastName,
                phone,
                email
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert("No se pudo crear la sesión de pago.");
                }
            })
            .catch(error => {
                console.error(error);
                alert("Error al conectarse con Stripe.");
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

    // Cargar las horas reservadas y generar el calendario
    loadReservedHours(generateCalendar);
});

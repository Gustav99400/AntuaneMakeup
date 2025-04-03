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

    const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const firebaseConfig = {/* Configuración de Firebase */};
    
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();

    function loadReservedHours(callback) {
        database.ref("reservations").once("value", (snapshot) => {
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
            callback(reservedHours);
        });
    }

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
                hourElement.textContent = `${h}:00`;
                hourElement.dataset.time = `${h}:00`;

                if (isToday && h <= currentHour) {
                    hourElement.classList.add("disabled-hour");
                } else if (reservedHours[dateKey] && reservedHours[dateKey].includes(`${h}:00`)) {
                    hourElement.classList.add("reserved-hour");
                    hourElement.textContent += " (Ocupado)";
                } else {
                    hourElement.addEventListener("click", selectHour);
                }
                
                hoursContainer.appendChild(hourElement);
            }
            
            dayElement.appendChild(hoursContainer);
            calendarContainer.appendChild(dayElement);
        }
    }

    function selectHour(event) {
        if (event.target.classList.contains("reserved-hour")) {
            alert("Esta hora ya está ocupada, por favor seleccione otra.");
            return;
        }
        const selectedDate = event.target.closest(".day").dataset.date;
        const selectedTime = event.target.dataset.time;
        localStorage.setItem("selectedDateTime", JSON.stringify({ date: selectedDate, time: selectedTime }));
        popup.style.display = "block";
    }

    payButton.addEventListener("click", function () {
        const email = emailInput.value;
        const firstName = firstNameInput.value;
        const lastName = lastNameInput.value;
        const phone = phoneInput.value;
        const selectedDateTime = JSON.parse(localStorage.getItem("selectedDateTime"));

        if (!email || !firstName || !lastName || !phone || !selectedDateTime) {
            alert("Por favor, complete todos los campos antes de pagar.");
            return;
        }

        const newReservationRef = database.ref("reservations/" + email.replace(/\./g, ","));
        newReservationRef.once("value", (snapshot) => {
            const reservationsCount = snapshot.numChildren() + 1;
            newReservationRef.child(`cita_${reservationsCount}`).set({
                firstName,
                lastName,
                phone,
                date: selectedDateTime.date,
                time: selectedDateTime.time,
                service: selectedService.textContent,
                price: selectedPrice.textContent,
                duration: selectedDuration.textContent
            }).then(() => {
                alert("Reserva registrada exitosamente.");
                popup.style.display = "none";
                loadReservedHours(generateCalendar);
            }).catch(error => {
                alert("Error al registrar la reserva: " + error.message);
            });
        });
    });

    loadReservedHours(generateCalendar);
});

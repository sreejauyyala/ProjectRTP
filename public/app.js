const API = "";

let token = localStorage.getItem("token");
let currentUser = JSON.parse(localStorage.getItem("user")) || null;


/* =========================================================
   AUTHENTICATION
========================================================= */

function authHeaders() {

    return {
        Authorization: `Bearer ${token}`
    };

}


function jsonAuthHeaders() {

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };

}


async function getResponseData(response) {

    const text = await response.text();

    try {

        return JSON.parse(text);

    } catch (error) {

        console.error("Invalid server response:", text);

        throw new Error(
            "Server returned an invalid response."
        );

    }

}


/* =========================================================
   LOGIN CHECK
========================================================= */

function requireLogin() {

    const protectedPages = [
        "dashboard.html",
        "lost-found.html",
        "lost-found-records.html",
        "booking.html"
    ];


    const page =
        window.location.pathname
            .split("/")
            .pop();


    if (
        protectedPages.includes(page) &&
        !token
    ) {

        window.location.href =
            "login.html";

    }

}

/* =========================================================
   NAVIGATION
========================================================= */

function updateNavigation() {

    const userNameNav =
        document.getElementById("userNameNav");

    if (userNameNav && currentUser) {

        userNameNav.textContent =
            `Welcome, ${currentUser.name}`;

    }

}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    token = null;

    currentUser = null;

    window.location.href = "index.html";

}


/* =========================================================
   USER COUNT
========================================================= */

async function loadUserCount() {

    try {

        const response =
            await fetch("/api/users/count");

        const result =
            await getResponseData(response);

        const homeCount =
            document.getElementById(
                "homeRegisteredCount"
            );

        const dashboardCount =
            document.getElementById(
                "dashboardUserCount"
            );

        if (homeCount) {

            homeCount.textContent =
                result.count || 0;

        }

        if (dashboardCount) {

            dashboardCount.textContent =
                result.count || 0;

        }

    } catch (error) {

        console.error(
            "User count error:",
            error
        );

    }

}


/* =========================================================
   LOST AND FOUND
========================================================= */

async function reportItem(event) {

    event.preventDefault();

    if (!token) {

        window.location.href =
            "login.html";

        return;

    }


    const form =
        document.getElementById("itemForm");

    const formData =
        new FormData(form);


    try {

        const response =
            await fetch(
                "/api/items",
                {
                    method: "POST",
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    },
                    body: formData
                }
            );


        const result =
            await getResponseData(response);


        const message =
            document.getElementById(
                "itemMessage"
            );


        if (!response.ok) {

            message.textContent =
                result.message ||
                "Unable to report item";

            return;

        }


        message.textContent =
            result.message ||
            "Item reported successfully";


        message.className =
            "message success";


        form.reset();

setTimeout(() => {

    window.location.href =
        "lost-found-records.html";

}, 1200);

    } catch (error) {

        console.error(error);

        const message =
            document.getElementById(
                "itemMessage"
            );

        if (message) {

            message.textContent =
                error.message;

        }

    }

}


/* =========================================================
   LOAD LOST & FOUND TABLE
========================================================= */

async function loadLostFoundTable() {

    const table =
        document.getElementById(
            "lostFoundTableBody"
        );


    if (!table) {

        return;

    }


    if (!token) {

        return;

    }

    try {

        const response =
            await fetch(
                "/api/items",
                {
                    headers: authHeaders()
                }
            );


        const items =
            await getResponseData(response);


        if (!response.ok) {

            throw new Error(
                items.message ||
                "Unable to load records"
            );

        }


        /* Page table */

        if (table) {

            table.innerHTML = "";


            if (!items.length) {

                table.innerHTML = `
                    <tr>
                        <td colspan="10">
                            No lost or found items available.
                        </td>
                    </tr>
                `;

            }


            items.forEach(item => {

                const row =
                    document.createElement("tr");


                row.innerHTML = `

                    <td>
                        ${escapeHTML(item.itemName)}
                    </td>

                    <td>
                        ${escapeHTML(item.type)}
                    </td>

                    <td>
                        ${escapeHTML(item.description)}
                    </td>

                    <td>
                        ${escapeHTML(item.location)}
                    </td>

                    <td>

                        ${
                            item.image
                            ?
                            `<img
                                src="${item.image}"
                                class="table-image"
                                alt="Item">
                            `
                            :
                            "No Image"
                        }

                    </td>

                    <td>
                        ${escapeHTML(item.status)}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.reportedBy?.name ||
                            "Unknown"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.reportedBy?.email ||
                            ""
                        )}
                    </td>

                    <td>
                        ${formatDate(item.createdAt)}
                    </td>

                   <td>

    ${
        item.type === "Lost" &&
        item.reportedBy &&
        currentUser &&
        String(item.reportedBy._id) ===
        String(currentUser.id)
        ?
        `
        <button
            class="table-button claim-table-button"
            onclick="claimItem('${item._id}')">

            Claim

        </button>
        `
        :
        "-"
    }

</td>

                `;


                table.appendChild(row);

            });

        }


        const homeItemCount =
            document.getElementById(
                "homeItemCount"
            );


        const dashboardItemCount =
            document.getElementById(
                "dashboardItemCount"
            );


        if (homeItemCount) {

            homeItemCount.textContent =
                items.length;

        }


        if (dashboardItemCount) {

            dashboardItemCount.textContent =
                items.length;

        }


    } catch (error) {

        console.error(
            "Lost & Found error:",
            error
        );

    }

}


/* =========================================================
   CLAIM ITEM
========================================================= */

async function claimItem(id) {

    if (!token) {

        window.location.href =
            "login.html";

        return;

    }


    const confirmClaim =
        confirm(
            "Are you sure you want to claim this item?"
        );


    if (!confirmClaim) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/items/${id}/claim`,
                {
                    method: "PUT",
                    headers: authHeaders()
                }
            );


        const result =
            await getResponseData(response);


        alert(
            result.message ||
            "Item claimed successfully"
        );


        await loadLostFoundTable();

    } catch (error) {

        alert(error.message);

    }

}


/* =========================================================
   LOAD HALLS
========================================================= */

async function loadHalls() {

    const hallSelect =
        document.getElementById("hall");

    if (!hallSelect) {
        return;
    }


    try {

        hallSelect.innerHTML = `
            <option value="">
                Loading halls...
            </option>
        `;


        const response =
            await fetch("/api/halls", {
                headers: authHeaders()
            });


        const halls =
            await getResponseData(response);


        if (!response.ok) {

            throw new Error(
                halls.message ||
                "Unable to load halls"
            );

        }


        hallSelect.innerHTML = `
            <option value="">
                Select Seminar Hall
            </option>
        `;


        if (!Array.isArray(halls) || halls.length === 0) {

            hallSelect.innerHTML = `
                <option value="">
                    No halls available
                </option>
            `;

            return;
        }


        halls.forEach(hall => {

            const option =
                document.createElement("option");


            /* IMPORTANT:
               MongoDB ID is used as value
            */

            option.value =
                hall._id;


            option.textContent =
                `${hall.name} - Capacity ${hall.capacity} - ${hall.location}`;


            hallSelect.appendChild(option);

        });


    } catch (error) {

        console.error(
            "Hall loading error:",
            error
        );


        hallSelect.innerHTML = `
            <option value="">
                Unable to load halls
            </option>
        `;

    }

}


/* =========================================================
   CHECK HALL AVAILABILITY
========================================================= */

async function checkHallAvailability() {

    const hallId =
        document.getElementById("hall")?.value;

    const date =
        document.getElementById("bookingDate")?.value;

    const startTime =
        document.getElementById("startTime")?.value;

    const endTime =
        document.getElementById("endTime")?.value;

    const message =
        document.getElementById(
            "availabilityMessage"
        );


    if (
        !hallId ||
        !date ||
        !startTime ||
        !endTime
    ) {

        message.textContent =
            "Please select hall, date, start time and end time.";

        message.className =
            "message error";

        return;

    }


    try {

        const response =
            await fetch(
                "/api/halls/check-availability",
                {
                    method: "POST",

                    headers:
                        jsonAuthHeaders(),

                    body:
                        JSON.stringify({
                            hallId,
                            date,
                            startTime,
                            endTime
                        })
                }
            );


        const result =
            await getResponseData(response);


        if (!response.ok) {

            message.textContent =
                result.message ||
                "Unable to check availability.";

            message.className =
                "message error";

            return;

        }


        if (result.available) {

            message.textContent =
                `${result.hall.name} is available for the selected date and time.`;

            message.className =
                "message success";

        } else {

            message.textContent =
                `${result.hall.name} is already booked for the selected time.`;

            message.className =
                "message error";

        }


    } catch (error) {

        console.error(
            "Availability error:",
            error
        );


        message.textContent =
            error.message;

        message.className =
            "message error";

    }

}

/* =========================================================
   BOOK SEMINAR HALL
========================================================= */

async function bookHall(event) {

    event.preventDefault();


    if (!token) {

        window.location.href =
            "login.html";

        return;

    }


    const hallId =
        document.getElementById("hall").value;


    const date =
        document.getElementById(
            "bookingDate"
        ).value;


    const startTime =
        document.getElementById(
            "startTime"
        ).value;


    const endTime =
        document.getElementById(
            "endTime"
        ).value;


    const purpose =
        document.getElementById(
            "purpose"
        ).value.trim();


    const message =
        document.getElementById(
            "bookingMessage"
        );


    if (
        !hallId ||
        !date ||
        !startTime ||
        !endTime ||
        !purpose
    ) {

        message.textContent =
            "Please fill all booking fields.";

        message.className =
            "message error";

        return;

    }


    if (startTime >= endTime) {

        message.textContent =
            "End time must be after start time.";

        message.className =
            "message error";

        return;

    }


    try {

        const response =
            await fetch(
                "/api/bookings",
                {
                    method: "POST",

                    headers:
                        jsonAuthHeaders(),

                    body:
                        JSON.stringify({

                            hallId,

                            date,

                            startTime,

                            endTime,

                            purpose

                        })
                }
            );


        const result =
            await getResponseData(response);


        if (!response.ok) {

            message.textContent =
                result.message ||
                "Booking failed.";

            message.className =
                "message error";

            return;

        }


        message.textContent =
            result.message ||
            "Seminar hall booked successfully.";

        message.className =
            "message success";


        document.getElementById(
            "bookingForm"
        ).reset();


        await loadBookingTable();


    } catch (error) {

        console.error(
            "Booking error:",
            error
        );


        message.textContent =
            error.message;

        message.className =
            "message error";

    }

}

/* =========================================================
   LOAD BOOKINGS
========================================================= */

async function loadBookingTable() {

    const table =
        document.getElementById(
            "bookingTableBody"
        );


    if (!table) {

        return;

    }


    if (!token) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/all-bookings",
                {
                    headers:
                        authHeaders()
                }
            );


        const bookings =
            await getResponseData(response);


        if (!response.ok) {

            throw new Error(
                bookings.message ||
                "Unable to load bookings"
            );

        }


        table.innerHTML = "";


        if (
            !Array.isArray(bookings) ||
            bookings.length === 0
        ) {

            table.innerHTML = `
                <tr>
                    <td colspan="11">
                        No active bookings available.
                    </td>
                </tr>
            `;

        } else {

            bookings.forEach(
                booking => {

                    const row =
                        document.createElement(
                            "tr"
                        );


                    row.innerHTML = `

                        <td>
                            ${escapeHTML(
                                booking.hall?.name ||
                                "Unknown"
                            )}
                        </td>

                        <td>
                            ${
                                booking.hall?.capacity ||
                                ""
                            }
                        </td>

                        <td>
                            ${escapeHTML(
                                booking.hall?.location ||
                                ""
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                booking.date
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                booking.startTime
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                booking.endTime
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                booking.purpose
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                booking.user?.name ||
                                "Unknown"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                booking.user?.email ||
                                ""
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                booking.status
                            )}
                        </td>

                        <td>

    ${
        booking.user &&
        currentUser &&
        String(booking.user._id) ===
        String(currentUser.id)
        ?
        `
        <button
            class="table-button cancel-table-button"
            onclick="cancelBooking('${booking._id}')">

            Cancel

        </button>
        `
        :
        "-"
    }

</td>

                    `;


                    table.appendChild(row);

                }
            );

        }


        const homeBookingCount =
            document.getElementById(
                "homeBookingCount"
            );


        if (homeBookingCount) {

            homeBookingCount.textContent =
                bookings.length;

        }


    } catch (error) {

        console.error(
            "Booking table error:",
            error
        );


        table.innerHTML = `
            <tr>
                <td colspan="11">
                    Unable to load booking records.
                </td>
            </tr>
        `;

    }

}

/* =========================================================
   CANCEL BOOKING
========================================================= */

async function cancelBooking(id) {

    if (!token) {

        window.location.href =
            "login.html";

        return;

    }


    const confirmCancel =
        confirm(
            "Are you sure you want to cancel this booking?"
        );


    if (!confirmCancel) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/bookings/${id}/cancel`,
                {
                    method: "PUT",
                    headers: authHeaders()
                }
            );


        const result =
            await getResponseData(response);


        alert(
            result.message ||
            "Booking cancelled successfully."
        );


        await loadBookingTable();

    } catch (error) {

        alert(error.message);

    }

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {

        return "";

    }


    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


function formatDate(date) {

    if (!date) {

        return "";

    }


    return new Date(date)
        .toLocaleDateString("en-IN");

}


/* =========================================================
   STARTUP
========================================================= */

/* =========================================================
   REGISTER
========================================================= */

async function registerUser(event) {

    event.preventDefault();

    const name =
        document.getElementById("registerName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const message =
        document.getElementById("registerMessage");


    if (password !== confirmPassword) {

        message.textContent =
            "Passwords do not match.";

        message.className =
            "message error";

        return;
    }


    try {

        const response =
            await fetch("/api/register", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password
                })

            });


        const result =
            await getResponseData(response);


        if (!response.ok) {

            message.textContent =
                result.message ||
                "Registration failed.";

            message.className =
                "message error";

            return;
        }


        message.textContent =
            result.message ||
            "Registration successful.";

        message.className =
            "message success";


        document.getElementById(
            "registerForm"
        ).reset();


        setTimeout(() => {

            window.location.href =
                "login.html";

        }, 1500);


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        message.textContent =
            error.message ||
            "Unable to register.";

        message.className =
            "message error";

    }

}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser(event) {

    event.preventDefault();


    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;


    const message =
        document.getElementById("loginMessage");


    try {

        const response =
            await fetch("/api/login", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })

            });


        const result =
            await getResponseData(response);


        if (!response.ok) {

            message.textContent =
                result.message ||
                "Login failed.";

            message.className =
                "message error";

            return;
        }


        localStorage.setItem(
            "token",
            result.token
        );


        localStorage.setItem(
            "user",
            JSON.stringify(result.user)
        );


        token = result.token;

        currentUser = result.user;


        message.textContent =
            "Login successful! Redirecting...";

        message.className =
            "message success";


        setTimeout(() => {

            window.location.href =
                "dashboard.html";

        }, 1000);


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        message.textContent =
            error.message ||
            "Unable to login.";

        message.className =
            "message error";

    }

}

/* =========================================================
   LOAD DASHBOARD STATISTICS
========================================================= */

async function loadDashboardStats() {

    const registeredUsers =
        document.getElementById(
            "dashboardRegisteredUsers"
        );

    const lostItems =
        document.getElementById(
            "dashboardLostItems"
        );

    const foundItems =
        document.getElementById(
            "dashboardFoundItems"
        );

    const claimedItems =
        document.getElementById(
            "dashboardClaimedItems"
        );

    const activeBookings =
        document.getElementById(
            "dashboardActiveBookings"
        );


    /* Run only when dashboard elements exist */

    if (
        !registeredUsers ||
        !lostItems ||
        !foundItems ||
        !claimedItems ||
        !activeBookings
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/dashboard/stats"
            );


        const result =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Unable to load dashboard statistics"
            );

        }


        console.log(
            "Dashboard data received:",
            result
        );


        registeredUsers.textContent =
            result.registeredUsers ?? 0;


        lostItems.textContent =
            result.lostItems ?? 0;


        foundItems.textContent =
            result.foundItems ?? 0;


        claimedItems.textContent =
            result.claimedItems ?? 0;


        activeBookings.textContent =
            result.activeBookings ?? 0;


    } catch (error) {

        console.error(
            "Dashboard statistics error:",
            error
        );

    }

}

/* =========================================================
   STARTUP
========================================================= */

window.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------------------
       CHECK LOGIN FOR PROTECTED PAGES
    ----------------------------------------- */

    requireLogin();


    /* -----------------------------------------
       COMMON NAVIGATION
    ----------------------------------------- */

    updateNavigation();


    /* -----------------------------------------
       HOME + DASHBOARD USER COUNT
    ----------------------------------------- */

    loadUserCount();

    
    loadDashboardStats();
    /* -----------------------------------------
       REGISTER PAGE
    ----------------------------------------- */

    const registerForm =
        document.getElementById("registerForm");

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            registerUser
        );

    }


    /* -----------------------------------------
       LOGIN PAGE
    ----------------------------------------- */

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            loginUser
        );

    }


    /* -----------------------------------------
       REPORT LOST / FOUND PAGE
       lost-found.html
    ----------------------------------------- */

    const itemForm =
        document.getElementById("itemForm");

    if (itemForm) {

        itemForm.addEventListener(
            "submit",
            reportItem
        );

    }


    /* -----------------------------------------
       LOST & FOUND RECORDS PAGE
       lost-found-records.html
    ----------------------------------------- */

    const lostFoundTable =
        document.getElementById(
            "lostFoundTableBody"
        );

    if (lostFoundTable) {

        loadLostFoundTable();

    }


    /* -----------------------------------------
       SEMINAR HALL BOOKING PAGE
       booking.html
    ----------------------------------------- */

    const hallSelect =
        document.getElementById("hall");

    if (hallSelect) {

        loadHalls();

    }


    /* -----------------------------------------
       BOOKING FORM
    ----------------------------------------- */

    const bookingForm =
        document.getElementById(
            "bookingForm"
        );

    if (bookingForm) {

        bookingForm.addEventListener(
            "submit",
            bookHall
        );

    }


    /* -----------------------------------------
       BOOKING TABLE
       booking.html
    ----------------------------------------- */

    const bookingTable =
        document.getElementById(
            "bookingTableBody"
        );

    if (bookingTable) {

        loadBookingTable();

    }

});
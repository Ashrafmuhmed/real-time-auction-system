const $ = (id) => document.getElementById(id);

const API_BASE = "http://localhost:3000";

const state = {
    connected: false,
    auctionId: null,
    token: null,
    adminToken: null,
    socket: null,
    auctions: {},
    countdowns: {}
};

function setAdminMessage(message, isError = false) {
    const node = $("adminMessage");
    node.textContent = message;
    node.style.color = isError ? "#c0392b" : "";
}

function setCreateMessage(message, isError = false) {
    const node = $("createMessage");
    node.textContent = message;
    node.style.color = isError ? "#c0392b" : "";
}

async function apiRequest(endpoint, method = "GET", body = null, token) {
    const headers = {
        "Content-Type": "application/json"
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
}

function setAuthMessage(message, isError = false) {
    const node = $("authMessage");
    node.textContent = message;
    node.style.color = isError ? "#c0392b" : "";
}

function updateAuthUI() {
    const authSection = $("authSection");
    const mainSection = $("mainAppSection");
    const userInfo = $("userInfo");

    if (state.token) {
        authSection.classList.add("hidden");
        mainSection.classList.remove("hidden");
        $("tokenInput").value = state.token;
        $("adminTokenInput").value = state.token;
        userInfo.innerHTML = `<span>Logged in</span> <button id="btnLogout">Logout</button>`;
        $("btnLogout").addEventListener("click", logout);
    } else {
        authSection.classList.remove("hidden");
        mainSection.classList.add("hidden");
        userInfo.innerHTML = "";
    }
}

async function login() {
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    if (!email || !password) {
        setAuthMessage("Email and password required", true);
        return;
    }

    try {
        const data = await apiRequest("/auth/login", "POST", { email, password });
        state.token = data.token;
        localStorage.setItem("auctionToken", state.token);
        setAuthMessage("Login successful!");
        updateAuthUI();
        log("Logged in successfully");
    } catch (err) {
        setAuthMessage(err.message, true);
    }
}

async function register() {
    const name = $("regName").value.trim();
    const email = $("regEmail").value.trim();
    const password = $("regPassword").value;

    if (!name || !email || !password) {
        setAuthMessage("All fields required", true);
        return;
    }

    try {
        await apiRequest("/auth/register", "POST", { name, email, password });
        setAuthMessage("Registration successful! Please login.");
        $("loginEmail").value = email;
        $("loginPassword").value = "";
        document.querySelector('[data-tab="login"]').click();
    } catch (err) {
        setAuthMessage(err.message, true);
    }
}

function logout() {
    state.token = null;
    state.adminToken = null;
    localStorage.removeItem("auctionToken");
    if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
    }
    state.connected = false;
    setStatus("Disconnected");
    updateAuthUI();
    log("Logged out");
}

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
        if (tab.dataset.tab === "login") {
            $("loginForm").classList.remove("hidden");
            $("registerForm").classList.add("hidden");
        } else {
            $("loginForm").classList.add("hidden");
            $("registerForm").classList.remove("hidden");
        }
    });
});

$("btnLogin").addEventListener("click", login);
$("btnRegister").addEventListener("click", register);

const savedToken = localStorage.getItem("auctionToken");
if (savedToken) {
    state.token = savedToken;
    updateAuthUI();
}

async function listAuctions() {
    try {
        const data = await apiRequest("/auction", "GET", null, state.adminToken);
        const list = $("auctionsList");
        list.innerHTML = "";
        
        if (!data.auctions || data.auctions.length === 0) {
            list.innerHTML = "<div>No auctions found</div>";
            return;
        }

        data.auctions.forEach(auction => {
            const row = document.createElement("div");
            row.className = "joined-item";
            row.innerHTML = `
                <span>ID: ${auction.id} | ${auction.title} | Status: ${auction.status}</span>
            `;
            list.appendChild(row);
        });
        
        setAdminMessage(`Found ${data.auctions.length} auctions`);
    } catch (err) {
        setAdminMessage(err.message, true);
    }
}

async function startAuction(auctionId) {
    try {
        await apiRequest(`/auction/${auctionId}/start`, "PUT", null, state.adminToken);
        setAdminMessage(`Auction ${auctionId} started`);
        listAuctions();
    } catch (err) {
        setAdminMessage(err.message, true);
    }
}

async function endAuction(auctionId) {
    try {
        await apiRequest(`/auction/${auctionId}/end`, "PUT", null, state.adminToken);
        setAdminMessage(`Auction ${auctionId} ended`);
        listAuctions();
    } catch (err) {
        setAdminMessage(err.message, true);
    }
}

async function createAuction() {
    const title = $("createTitleInput").value.trim();
    const description = $("createDescInput").value.trim();
    const startPrice = Number($("createPriceInput").value);
    const duration = Number($("createDurationInput").value);

    if (!title || !description || !startPrice || !duration) {
        setCreateMessage("All fields required", true);
        return;
    }

    try {
        const data = await apiRequest("/auction", "POST", {
            title,
            description,
            startPrice,
            startTime: new Date().toISOString(),
            duration
        }, state.adminToken);
        setCreateMessage(`Auction created with ID: ${data.auction.id}`);
        $("createTitleInput").value = "";
        $("createDescInput").value = "";
        $("createPriceInput").value = "";
        $("createDurationInput").value = "";
        listAuctions();
    } catch (err) {
        setCreateMessage(err.message, true);
    }
}

function formatRemainingTime(milliseconds) {
    if (milliseconds <= 0) return "Ended";
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
}

function ensureAuctionState(auctionId) {
    const normalizedId = String(auctionId);
    if (!state.auctions[normalizedId]) {
        state.auctions[normalizedId] = {
            currentBid: 0,
            bidder: "-",
            timeLeft: "-"
        };
    }
    return state.auctions[normalizedId];
}

function stopCountdown(auctionId) {
    const normalizedId = String(auctionId);
    const countdown = state.countdowns[normalizedId];
    if (!countdown) return;
    if (countdown.intervalId) clearInterval(countdown.intervalId);
    delete state.countdowns[normalizedId];
}

function renderCountdown(auctionId) {
    const normalizedId = String(auctionId);
    const countdown = state.countdowns[normalizedId];
    if (!countdown) return;
    const auctionState = ensureAuctionState(normalizedId);
    const nowMs = Date.now() + (countdown.offsetMs || 0);
    const remaining = countdown.endTimeMs - nowMs;
    auctionState.timeLeft = formatRemainingTime(remaining);
    if (state.auctionId === normalizedId) {
        updateAuctionUI(normalizedId);
    }
    if (remaining <= 0) {
        stopCountdown(normalizedId);
    }
}

function startCountdown(auctionId, endTimeMs, serverNowMs) {
    if (!auctionId || !Number.isFinite(endTimeMs)) return;
    const normalizedId = String(auctionId);
    ensureAuctionState(normalizedId);
    stopCountdown(normalizedId);

    const offsetMs = Number.isFinite(serverNowMs) ? (serverNowMs - Date.now()) : 0;
    state.countdowns[normalizedId] = {
        intervalId: null,
        endTimeMs,
        offsetMs,
    };

    renderCountdown(normalizedId);
    if (endTimeMs <= (Date.now() + offsetMs)) return;

    state.countdowns[normalizedId].intervalId = window.setInterval(() => {
        renderCountdown(normalizedId);
    }, 1000);
}

function stopAllCountdowns() {
    Object.keys(state.countdowns).forEach((auctionId) => stopCountdown(auctionId));
}

function setStatus(text) {
    $("connStatus").textContent = text;
}

function setBidMessage(message, isError = false) {
    const node = $("bidMessage");
    node.textContent = message;
    node.style.color = isError ? "#c0392b" : "";
}

function isAuctionEnded(auctionId) {
    const normalizedId = String(auctionId);
    const countdown = state.countdowns[normalizedId];
    if (countdown && Number.isFinite(countdown.endTimeMs)) {
        return (Date.now() + (countdown.offsetMs || 0)) >= countdown.endTimeMs;
    }
    return state.auctions[normalizedId]?.timeLeft === "Ended";
}

function updateBidControls(auctionId) {
    const button = $("btnBid");
    const ended = auctionId ? isAuctionEnded(auctionId) : false;
    button.style.display = ended ? "none" : "";
    if (ended) {
        setBidMessage("Auction ended. Bidding is closed.", true);
    }
}

function log(msg) {
    const el = document.createElement("div");
    el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    $("log").prepend(el);
}

function applyAuctionSnapshot(auctionSnapshot) {
    if (!auctionSnapshot || auctionSnapshot.id == null) return null;
    const auctionId = String(auctionSnapshot.id);
    const previous = ensureAuctionState(auctionId);
    state.auctions[auctionId] = {
        ...previous,
        currentBid: auctionSnapshot.currentBid ?? auctionSnapshot.startPrice ?? previous.currentBid ?? 0,
        bidder: auctionSnapshot.winner ?? previous.bidder ?? "-",
        timeLeft: previous.timeLeft ?? "-",
    };
    return auctionId;
}

function updateAuctionUI(auctionId) {
    const data = state.auctions[auctionId];
    $("selectedAuction").textContent = auctionId || "-";
    if (!data) {
        $("currentBid").textContent = "$0";
        $("currentBidder").textContent = "-";
        $("timeLeft").textContent = "-";
        updateBidControls(null);
        return;
    }
    if (data.currentBid != null) $("currentBid").textContent = `$${data.currentBid}`;
    if (data.bidder != null) $("currentBidder").textContent = data.bidder;
    if (data.timeLeft != null) $("timeLeft").textContent = data.timeLeft;
    updateBidControls(auctionId);
}

function addJoinedAuction(id) {
    if (!id) return;
    const list = $("joinedList");
    if (list.querySelector(`[data-id="${id}"]`)) return;

    const row = document.createElement("div");
    row.className = "joined-item";
    row.dataset.id = id;

    const label = document.createElement("span");
    label.textContent = id;

    const btn = document.createElement("button");
    btn.className = "secondary";
    btn.textContent = "Select";
    btn.addEventListener("click", () => selectAuction(id));

    row.appendChild(label);
    row.appendChild(btn);
    list.prepend(row);

    const option = document.createElement("option");
    option.value = id;
    option.textContent = id;
    $("auctionSelect").appendChild(option);
}

function selectAuction(id) {
    const normalizedId = String(id);
    state.auctionId = normalizedId;
    $("auctionSelect").value = normalizedId;
    log(`Selected auction ${normalizedId}`);
    updateAuctionUI(normalizedId);
}

const SOCKET_SERVER_URL = "http://localhost:3000";

function loadSocketIoClient() {
    if (typeof window.io === "function") return Promise.resolve(window.io);

    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-socket-io-client="true"]');
        if (existing) {
            if (typeof window.io === "function") {
                resolve(window.io);
                return;
            }
            existing.addEventListener("load", () => resolve(window.io));
            existing.addEventListener("error", () => reject(new Error("Failed to load Socket.IO client script")));
            return;
        }

        const script = document.createElement("script");
        script.src = `${SOCKET_SERVER_URL}/socket.io/socket.io.js`;
        script.dataset.socketIoClient = "true";
        script.onload = () => {
            if (typeof window.io !== "function") {
                reject(new Error("Socket.IO client loaded but io is unavailable"));
                return;
            }
            resolve(window.io);
        };
        script.onerror = () => reject(new Error("Failed to load Socket.IO client script"));
        document.head.appendChild(script);
    });
}

const realtime = {
    async connect(token) {
        try {
            const io = await loadSocketIoClient();

            if (state.socket) {
                state.socket.removeAllListeners();
                state.socket.disconnect();
                state.socket = null;
            }
            stopAllCountdowns();

            setStatus("Connecting...");
            setBidMessage("");

            const socket = io(SOCKET_SERVER_URL, {
                autoConnect: false,
                reconnection: false,
                timeout: 5000,
                auth: {token},
                query: {token}
            });

            socket.on("connect", () => {
                state.connected = true;
                setStatus("Connected");
                log(`Connected as ${socket.id}`);
            });

            socket.on("connect_error", (err) => {
                state.connected = false;
                setStatus("Connection failed");
                const reason = err?.message || "Unable to connect to socket server";
                setBidMessage(`Connection error: ${reason}`, true);
                log(`Connection error: ${reason}`);
            });

            socket.on("disconnect", (reason) => {
                state.connected = false;
                setStatus("Disconnected");
                log(`Socket disconnected: ${reason}`);
                stopAllCountdowns();
                updateAuctionUI(state.auctionId);
            });

            socket.on("auction:update", (payload) => {

                let {auctionId, bidder, amount} = payload;

                if (!auctionId) return;
                auctionId = String(auctionId);

                const previous = ensureAuctionState(auctionId);
                if (bidder == null) bidder = previous.bidder;
                if (amount == null) amount = previous.currentBid;

                state.auctions[auctionId] = {
                    ...previous,
                    currentBid: amount,
                    bidder,
                };

                if ($("auctionSelect").querySelector(`option[value="${auctionId}"]`) == null) {
                    addJoinedAuction(auctionId);
                }

                if (state.auctionId === auctionId) {
                    updateAuctionUI(auctionId);
                    setBidMessage(`Auction ${auctionId} updated`);
                }

                log(`Auction ${auctionId} updated: bid $${state.auctions[auctionId].currentBid} by ${state.auctions[auctionId].bidder}`);
            });

            socket.on("startCountDown", (payload) => {
                const {auctionId, endTime, serverNow} = payload || {};
                if (!auctionId || endTime == null) return;
                startCountdown(auctionId, Number(endTime), Number(serverNow));
            });

            state.socket = socket;
            socket.connect();
        } catch (err) {
            state.connected = false;
            setStatus("Connection failed");
            const reason = err?.message || "Unknown error while connecting";
            setBidMessage(`Connection error: ${reason}`, true);
            log(`Connection setup error: ${reason}`);
        }
    },
    joinAuction(auctionId) {
        if (!state.socket || !state.connected) {
            const msg = "Connect first before joining an auction";
            setBidMessage(msg, true);
            log(msg);
            return;
        }

        state.socket.timeout(10000).emit("joinAuction", {auctionId}, (err, res) => {
            if (err) {
                const msg = "No response from server while joining auction";
                setBidMessage(msg, true);
                log(msg);
                return;
            }

            if (res.error) {
                setBidMessage(res.error, true);
                log(`Join failed for auction ${auctionId}: ${res.error}`);
                return;
            }

            const joinedAuctionId = applyAuctionSnapshot(res?.auction) || String(res?.auctionId || auctionId);
            state.auctionId = joinedAuctionId;
            addJoinedAuction(joinedAuctionId);
            if (res?.endTime != null) {
                startCountdown(joinedAuctionId, Number(res.endTime), Number(res.serverNow));
            }
            log(`Joined auction ${joinedAuctionId}`);
            setBidMessage(`Joined auction ${joinedAuctionId}`);
            ensureAuctionState(joinedAuctionId);
            updateAuctionUI(joinedAuctionId);
        });
    },
    placeBid(amount) {
        if (!state.socket || !state.connected) {
            const msg = "Connect first before placing a bid";
            setBidMessage(msg, true);
            log(msg);
            return;
        }

        if (!state.auctionId) {
            const msg = "Select an auction first";
            setBidMessage(msg, true);
            log(msg);
            return;
        }

        if (isAuctionEnded(state.auctionId)) {
            const msg = "Auction ended. You can't place a bid.";
            setBidMessage(msg, true);
            log(msg);
            updateBidControls(state.auctionId);
            return;
        }

        state.socket.timeout(5000).emit("placeBid", {
            auctionId: state.auctionId,
            amount
        }, (err, res) => {
            if (err) {
                const msg = "No response from server while placing bid";
                setBidMessage(msg, true);
                log(msg);
                return;
            }

            if (res?.error) {
                setBidMessage(res.error, true);
                log(`Bid failed on auction ${state.auctionId}: ${res.error}`);
                return;
            }

            log(`Bid accepted: $${amount} on ${state.auctionId}`);
            setBidMessage("Bid accepted");
        });
    }
};

$("btnConnect").addEventListener("click", () => {
    state.token = $("tokenInput").value.trim();
    if (!state.token) {
        setBidMessage("Token required", true);
        return log("Token required");
    }
    realtime.connect(state.token);
});

$("btnJoin").addEventListener("click", () => {
    const id = $("auctionIdInput").value.trim();
    if (!id) return log("Auction ID required");
    realtime.joinAuction(id);
});

$("btnBid").addEventListener("click", () => {
    const selected = $("auctionSelect").value;
    const amount = Number($("bidAmountInput").value);
    if (!selected) return log("Select an auction first");
    if (!amount || amount <= 0) return log("Enter a valid bid amount");
    selectAuction(selected);
    realtime.placeBid(amount);
});

$("btnListAuctions").addEventListener("click", () => {
    state.adminToken = $("adminTokenInput").value.trim();
    if (!state.adminToken) {
        setAdminMessage("Token required", true);
        return;
    }
    listAuctions();
});

$("btnCreateAuction").addEventListener("click", () => {
    state.adminToken = $("adminTokenInput").value.trim();
    if (!state.adminToken) {
        setCreateMessage("Token required", true);
        return;
    }
    createAuction();
});

$("btnStartAuction").addEventListener("click", () => {
    const id = $("adminAuctionIdInput").value.trim();
    if (!id) {
        setAdminMessage("Auction ID required", true);
        return;
    }
    if (!state.adminToken) {
        state.adminToken = $("adminTokenInput").value.trim();
    }
    if (!state.adminToken) {
        setAdminMessage("Token required", true);
        return;
    }
    startAuction(id);
});

$("btnEndAuction").addEventListener("click", () => {
    const id = $("adminAuctionIdInput").value.trim();
    if (!id) {
        setAdminMessage("Auction ID required", true);
        return;
    }
    if (!state.adminToken) {
        state.adminToken = $("adminTokenInput").value.trim();
    }
    if (!state.adminToken) {
        setAdminMessage("Token required", true);
        return;
    }
    endAuction(id);
});

setTimeout(() => {
    log("Frontend ready. Enter JWT token then click Connect.");
}, 1200);

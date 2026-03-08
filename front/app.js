const $ = (id) => document.getElementById(id);

const state = {
    connected: false,
    auctionId: null,
    token: null,
    socket: null,
    auctions: {}
};

function setStatus(text) {
    $("connStatus").textContent = text;
}

function setBidMessage(message, isError = false) {
    const node = $("bidMessage");
    node.textContent = message;
    node.style.color = isError ? "#c0392b" : "";
}

function log(msg) {
    const el = document.createElement("div");
    el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    $("log").prepend(el);
}

function applyAuctionSnapshot(auctionSnapshot) {
    if (!auctionSnapshot || auctionSnapshot.id == null) return null;
    const auctionId = String(auctionSnapshot.id);
    const previous = state.auctions[auctionId] || {currentBid: 0, bidder: "-", timeLeft: "-"};
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
        return;
    }
    if (data.currentBid != null) $("currentBid").textContent = `$${data.currentBid}`;
    if (data.bidder != null) $("currentBidder").textContent = data.bidder;
    if (data.timeLeft != null) $("timeLeft").textContent = data.timeLeft;
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
            });

            socket.on("auction:update", (payload) => {

                let{ auctionId , bidder , amount } = payload;

                if(!auctionId) return;
                auctionId = String(auctionId);

                const previous = state.auctions[auctionId] || {currentBid: 0, bidder: "-", timeLeft: "-"};
                if(bidder == null) bidder = previous.bidder;
                if(amount == null) amount = previous.currentBid;

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

        state.socket.timeout(10000).emit("joinAuction", {auctionId}, (err ,res) => {
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
            log(`Joined auction ${joinedAuctionId}`);
            setBidMessage(`Joined auction ${joinedAuctionId}`);
            if (!state.auctions[joinedAuctionId]) {
                state.auctions[joinedAuctionId] = {currentBid: 0, bidder: "-", timeLeft: "-"};
            }
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

setTimeout(() => {
    log("Frontend ready. Enter JWT token then click Connect.");
}, 1200);

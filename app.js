import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fmcmnwoopbmitqufaoys.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6jC-frTceZf32cL3ZUAOqA_q5lGRM6K';


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);

// --------------------
// DOM
// --------------------
const toast = $("toast");
const profileModal = $("profileModal");
const profileUsername = $("profileUsername");
const profileDisplayName = $("profileDisplayName");
const saveProfileBtn = $("saveProfileBtn");
const soundToggleBtn = $("soundToggleBtn");

const topAvatar = $("topAvatar");
const topName = $("topName");
const profileBtn = $("profileBtn");
const profileCard = $("profileCard");
const profileAvatarBig = $("profileAvatarBig");
const profileDisplayText = $("profileDisplayText");
const profileUsernameText = $("profileUsernameText");
const profileOnlineText = $("profileOnlineText");
const profileWins = $("profileWins");
const profileLosses = $("profileLosses");

const homeScreen = $("homeScreen");
const gameScreen = $("gameScreen");

const hostName = $("hostName");
const joinName = $("joinName");
const joinCode = $("joinCode");
const createRoomBtn = $("createRoomBtn");
const joinRoomBtn = $("joinRoomBtn");

const friendUsernameInput = $("friendUsernameInput");
const addFriendBtn = $("addFriendBtn");
const friendsList = $("friendsList");
const incomingFriendRequests = $("incomingFriendRequests");
const outgoingFriendRequests = $("outgoingFriendRequests");
const inviteList = $("inviteList");
const gameFriendsList = $("gameFriendsList");

const roomCodeText = $("roomCodeText");
const statusBanner = $("statusBanner");
const copyCodeBtn = $("copyCodeBtn");
const leaveRoomBtn = $("leaveRoomBtn");
const inviteFriendsBtn = $("inviteFriendsBtn");
const summaryTurn = $("summaryTurn");
const summaryOpponent = $("summaryOpponent");
const summaryHostScore = $("summaryHostScore");
const summaryGuestScore = $("summaryGuestScore");

const hostCard = $("hostCard");
const guestCard = $("guestCard");
const hostTurnBadge = $("hostTurnBadge");
const guestTurnBadge = $("guestTurnBadge");
const hostAvatar = $("hostAvatar");
const guestAvatar = $("guestAvatar");
const hostPlayerName = $("hostPlayerName");
const guestPlayerName = $("guestPlayerName");
const hostReady = $("hostReady");
const guestReady = $("guestReady");
const hostScore = $("hostScore");
const guestScore = $("guestScore");

const timerText = $("timerText");
const timerRingProgress = $("timerRingProgress");
const secretChooser = $("secretChooser");
const guessPanel = $("guessPanel");
const finishedPanel = $("finishedPanel");
const secretInput = $("secretInput");
const saveSecretBtn = $("saveSecretBtn");
const guessInput = $("guessInput");
const guessBtn = $("guessBtn");
const lastHint = $("lastHint");
const winnerBanner = $("winnerBanner");
const playAgainBtn = $("playAgainBtn");
const requestRematchBtn = $("requestRematchBtn");
const rematchBox = $("rematchBox");

const historyList = $("historyList");
const chatMessages = $("chatMessages");
const chatInput = $("chatInput");
const sendChatBtn = $("sendChatBtn");

// --------------------
// STATE
// --------------------
let playerId = getOrCreatePlayerId();
let myProfile = null;
let soundEnabled = localStorage.getItem("guess_duel_sound") !== "false"; // default true

let currentRoom = null;
let secrets = [];
let guesses = [];
let scores = [];
let messages = [];
let friends = [];
let incomingRequests = [];
let outgoingRequests = [];
let invites = [];
let rematchRequests = [];

let realtimeChannels = [];
let timerInterval = null;
let audioCtx = null;
let lastRenderedMessageId = null;

// --------------------
// HELPERS
// --------------------
function getOrCreatePlayerId() {
  let id = localStorage.getItem("guess_duel_player_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("guess_duel_player_id", id);
  }
  return id;
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const target = encodeURIComponent(name) + "=";
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    if (p.startsWith(target)) return decodeURIComponent(p.slice(target.length));
  }
  return "";
}

function showToast(text, isError = false) {
  toast.textContent = text;
  toast.className = `toast ${isError ? "error" : ""}`;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function escapeHtml(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getInitial(text = "") {
  return (text.trim()[0] || "?").toUpperCase();
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function isHost() {
  return currentRoom?.host_player_id === playerId;
}

function getMyName() {
  return myProfile?.display_name || hostName.value.trim() || joinName.value.trim() || "Player";
}

function getOpponentId() {
  if (!currentRoom) return null;
  return isHost() ? currentRoom.guest_player_id : currentRoom.host_player_id;
}

function getOpponentName() {
  if (!currentRoom) return "Opponent";
  return isHost() ? (currentRoom.guest_name || "Guest") : currentRoom.host_name;
}

function mySecretChosen() {
  return secrets.some(s => s.player_id === playerId);
}

function bothSecretsChosen() {
  if (!currentRoom?.guest_player_id) return false;
  return secrets.length >= 2;
}

function getScore(playerIdToFind) {
  return scores.find(s => s.player_id === playerIdToFind)?.points || 0;
}

function isMyTurn() {
  return currentRoom?.current_turn_player_id === playerId;
}

function getTargetIdForGuess() {
  return getOpponentId();
}

function setHomeMode() {
  homeScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
}

function setGameMode() {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
}

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function getResultText(result) {
  if (result === "low") return "Too Low";
  if (result === "high") return "Too High";
  if (result === "correct") return "Correct";
  if (result === "timeout") return "Timed out";
  return result;
}

function onlineMarkup(isOnline) {
  return `<span class="onlineBadge"><span class="dot ${isOnline ? "online" : "offline"}"></span>${isOnline ? "Online" : "Offline"}</span>`;
}

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playChatSound() {
  if (!soundEnabled) return;
  try {
    ensureAudio();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.exponentialRampToValueAtTime(1120, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
}

// --------------------
// PROFILE
// --------------------
async function ensureProfileBootstrapped() {
  const cookieUsername = getCookie("guess_duel_username");
  const cookieDisplay = getCookie("guess_duel_display_name");

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle();

  if (data) {
    myProfile = data;
    await setPresence(true);
    renderProfile();
    return;
  }

  if (cookieUsername && cookieDisplay) {
    const { error } = await supabase.from("user_profiles").insert({
      player_id: playerId,
      username: cookieUsername.toLowerCase(),
      display_name: cookieDisplay,
      wins: 0,
      losses: 0,
      is_online: true
    });

    if (!error) {
      await reloadMyProfile();
      profileModal.classList.add("hidden");
      return;
    }
  }

  profileModal.classList.remove("hidden");
}

async function reloadMyProfile() {
  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle();

  myProfile = data || null;
  if (myProfile) {
    await setPresence(true);
    renderProfile();
  }
}

function renderProfile() {
  if (!myProfile) return;

  const initial = getInitial(myProfile.display_name);
  topAvatar.textContent = initial;
  topName.textContent = myProfile.display_name;
  profileAvatarBig.textContent = initial;
  profileDisplayText.textContent = myProfile.display_name;
  profileUsernameText.textContent = `@${myProfile.username}`;
  profileOnlineText.innerHTML = onlineMarkup(!!myProfile.is_online);
  profileWins.textContent = String(myProfile.wins || 0);
  profileLosses.textContent = String(myProfile.losses || 0);
  hostName.value = myProfile.display_name;
  joinName.value = myProfile.display_name;

  // Update sound button
  soundToggleBtn.classList.toggle("muted", !soundEnabled);
  soundToggleBtn.textContent = soundEnabled ? "🔊" : "🔇";
}

async function saveProfile() {
  const username = profileUsername.value.trim().toLowerCase();
  const displayName = profileDisplayName.value.trim();

  if (!username || !displayName) {
    showToast("Enter username and display name.", true);
    return;
  }

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "Saving...";

  try {
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("player_id")
      .eq("username", username)
      .maybeSingle();

    if (existing && existing.player_id !== playerId) {
      showToast("Username already taken.", true);
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = "Save Profile";
      return;
    }

    // save locally first so popup feels instant
    setCookie("guess_duel_username", username);
    setCookie("guess_duel_display_name", displayName);

    profileModal.classList.add("hidden");
    showToast("Profile saved.");

    const payload = {
      player_id: playerId,
      username,
      display_name: displayName,
      is_online: true
    };

    const { error } = await supabase
      .from("user_profiles")
      .upsert(payload, { onConflict: "player_id" });

    if (error) {
      showToast(error.message, true);
      profileModal.classList.remove("hidden");
      return;
    }

    await reloadMyProfile();
    await loadHomeData();
  } finally {
    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = "Save Profile";
  }
}

async function setPresence(isOnline) {
  await supabase
    .from("user_profiles")
    .update({
      is_online: isOnline,
      last_seen_at: new Date().toISOString()
    })
    .eq("player_id", playerId);
}

// --------------------
// HOME DATA
// --------------------
async function loadHomeData() {
  await Promise.all([
    loadFriends(),
    loadFriendRequests(),
    loadInvites()
  ]);
}

async function loadFriends() {
  const { data: links } = await supabase
    .from("friends")
    .select("friend_player_id")
    .eq("player_id", playerId);

  const friendIds = (links || []).map(x => x.friend_player_id);
  if (!friendIds.length) {
    friends = [];
    renderFriends();
    return;
  }

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("*")
    .in("player_id", friendIds)
    .order("display_name");

  friends = profiles || [];
  renderFriends();
}

function renderFriends() {
  const html = friends.length
    ? friends.map(f => `
      <div class="item">
        <div class="friendTop">
          <div>
            <strong>${escapeHtml(f.display_name)}</strong>
            <div style="color:#9eb1d9;margin-top:4px;">@${escapeHtml(f.username)}</div>
          </div>
          <div>${onlineMarkup(!!f.is_online)}</div>
        </div>
        <div class="friendActions">
          <button class="btn btn-secondary friendInviteBtn" data-player="${f.player_id}">Invite to Room</button>
        </div>
      </div>
    `).join("")
    : `<div class="empty">No friends added yet.</div>`;

  friendsList.innerHTML = html;
  if (gameFriendsList) gameFriendsList.innerHTML = html;

  document.querySelectorAll(".friendInviteBtn").forEach(btn => {
    btn.onclick = () => inviteFriend(btn.dataset.player);
  });
}

async function loadFriendRequests() {
  const [incomingRes, outgoingRes] = await Promise.all([
    supabase
      .from("friend_requests")
      .select("*")
      .eq("to_player_id", playerId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("friend_requests")
      .select("*")
      .eq("from_player_id", playerId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
  ]);

  incomingRequests = incomingRes.data || [];
  outgoingRequests = outgoingRes.data || [];
  renderFriendRequests();
}

function renderFriendRequests() {
  incomingFriendRequests.innerHTML = incomingRequests.length
    ? incomingRequests.map(req => `
      <div class="item">
        <strong>@${escapeHtml(req.from_username)}</strong> sent you a request
        <div class="friendActions">
          <button class="btn btn-secondary acceptReqBtn" data-id="${req.id}" data-from="${req.from_player_id}">Accept</button>
          <button class="btn btn-danger declineReqBtn" data-id="${req.id}">Decline</button>
        </div>
      </div>
    `).join("")
    : `<div class="empty">No requests yet.</div>`;

  outgoingFriendRequests.innerHTML = outgoingRequests.length
    ? outgoingRequests.map(req => `
      <div class="item">
        Friend request sent to <strong>@${escapeHtml(req.to_player_id)}</strong>
      </div>
    `).join("")
    : `<div class="empty">No outgoing requests.</div>`;

  document.querySelectorAll(".acceptReqBtn").forEach(btn => {
    btn.onclick = () => acceptFriendRequest(btn.dataset.id, btn.dataset.from);
  });
  document.querySelectorAll(".declineReqBtn").forEach(btn => {
    btn.onclick = () => declineFriendRequest(btn.dataset.id);
  });
}

async function addFriend() {
  if (!myProfile) {
    showToast("Save profile once first.", true);
    profileModal.classList.remove("hidden");
    return;
  }

  const username = friendUsernameInput.value.trim().toLowerCase();
  if (!username) return;

  const { data: target } = await supabase
    .from("user_profiles")
    .select("player_id, username, display_name")
    .eq("username", username)
    .maybeSingle();

  if (!target) {
    showToast("Username not found.", true);
    return;
  }
  if (target.player_id === playerId) {
    showToast("You cannot add yourself.", true);
    return;
  }

  const { data: alreadyFriend } = await supabase
    .from("friends")
    .select("id")
    .eq("player_id", playerId)
    .eq("friend_player_id", target.player_id)
    .maybeSingle();

  if (alreadyFriend) {
    showToast("Already friends.");
    return;
  }

  const { error } = await supabase.from("friend_requests").upsert({
    from_player_id: playerId,
    from_username: myProfile.username,
    to_player_id: target.player_id,
    status: "pending"
  }, { onConflict: "from_player_id,to_player_id" });

  if (error) {
    showToast(error.message, true);
    return;
  }

  friendUsernameInput.value = "";
  await loadFriendRequests();
  showToast("Friend request sent.");
}

async function acceptFriendRequest(id, fromPlayerId) {
  await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", id);
  await supabase.from("friends").insert([
    { player_id: playerId, friend_player_id: fromPlayerId },
    { player_id: fromPlayerId, friend_player_id: playerId }
  ]);
  await loadHomeData();
  showToast("Friend added.");
}

async function declineFriendRequest(id) {
  await supabase.from("friend_requests").update({ status: "declined" }).eq("id", id);
  await loadFriendRequests();
}

// --------------------
// INVITES
// --------------------
async function inviteFriend(friendPlayerId) {
  if (!currentRoom) {
    showToast("Create or join a room first.", true);
    return;
  }
  if (!myProfile) return;

  const { error } = await supabase.from("game_invites").insert({
    from_player_id: playerId,
    from_username: myProfile.username,
    to_player_id: friendPlayerId,
    room_code: currentRoom.room_code,
    status: "pending"
  });

  if (error) {
    showToast(error.message, true);
    return;
  }
  showToast("Invite sent.");
}

async function loadInvites() {
  const { data } = await supabase
    .from("game_invites")
    .select("*")
    .eq("to_player_id", playerId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  invites = data || [];
  renderInvites();
}

function renderInvites() {
  inviteList.innerHTML = invites.length
    ? invites.map(inv => `
      <div class="item">
        <strong>@${escapeHtml(inv.from_username)}</strong> invited you to room <strong>${escapeHtml(inv.room_code)}</strong>
        <div class="friendActions">
          <button class="btn btn-secondary acceptInviteBtn" data-id="${inv.id}" data-room="${inv.room_code}">Join</button>
          <button class="btn btn-danger declineInviteBtn" data-id="${inv.id}">Decline</button>
        </div>
      </div>
    `).join("")
    : `<div class="empty">No invites yet.</div>`;

  document.querySelectorAll(".acceptInviteBtn").forEach(btn => {
    btn.onclick = () => acceptInvite(btn.dataset.id, btn.dataset.room);
  });
  document.querySelectorAll(".declineInviteBtn").forEach(btn => {
    btn.onclick = () => declineInvite(btn.dataset.id);
  });
}

async function acceptInvite(id, roomCode) {
  await supabase.from("game_invites").update({ status: "accepted" }).eq("id", id);
  joinCode.value = roomCode;
  joinName.value = myProfile?.display_name || joinName.value;
  await joinRoom();
}

async function declineInvite(id) {
  await supabase.from("game_invites").update({ status: "declined" }).eq("id", id);
  await loadInvites();
}

// --------------------
// ROOM
// --------------------
async function createRoom() {
  const name = (hostName.value.trim() || myProfile?.display_name || "Host").slice(0, 20);
  const roomCode = generateRoomCode();

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      room_code: roomCode,
      host_name: name,
      host_player_id: playerId,
      status: "waiting",
      current_turn_player_id: playerId,
      turn_started_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    showToast(error.message, true);
    return;
  }

  await supabase.from("scores").insert([
    { room_id: room.id, player_id: playerId, points: 0 }
  ]);

  currentRoom = room;
  await openRoom(room.id);
  showToast("Room created.");
}

async function joinRoom() {
  const code = joinCode.value.trim().toUpperCase();
  const name = (joinName.value.trim() || myProfile?.display_name || "Guest").slice(0, 20);
  if (!code) {
    showToast("Enter room code.", true);
    return;
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("room_code", code)
    .maybeSingle();

  if (!room) {
    showToast("Room not found.", true);
    return;
  }
  if (room.guest_player_id && room.guest_player_id !== playerId) {
    showToast("Room is full.", true);
    return;
  }

  const { data: updated, error } = await supabase
    .from("rooms")
    .update({
      guest_name: name,
      guest_player_id: playerId,
      status: "choosing"
    })
    .eq("id", room.id)
    .select("*")
    .single();

  if (error) {
    showToast(error.message, true);
    return;
  }

  const { data: myScore } = await supabase
    .from("scores")
    .select("id")
    .eq("room_id", room.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (!myScore) {
    await supabase.from("scores").insert({ room_id: room.id, player_id: playerId, points: 0 });
  }

  currentRoom = updated;
  await openRoom(updated.id);
  showToast("Joined room.");
}

async function openRoom(roomId) {
  setGameMode();
  await loadRoomBundle(roomId);
  clearRealtime();
  subscribeHomeRealtime();
  subscribeRoomRealtime(roomId);
}

async function loadRoomBundle(roomId = currentRoom?.id) {
  if (!roomId) return;

  const [roomRes, secretsRes, guessesRes, scoresRes, messagesRes, rematchRes] = await Promise.all([
    supabase.from("rooms").select("*").eq("id", roomId).maybeSingle(),
    supabase.from("secrets").select("*").eq("room_id", roomId),
    supabase.from("guesses").select("*").eq("room_id", roomId).order("created_at"),
    supabase.from("scores").select("*").eq("room_id", roomId),
    supabase.from("messages").select("*").eq("room_id", roomId).order("created_at"),
    supabase.from("rematch_requests").select("*").eq("room_id", roomId).eq("status", "pending")
  ]);

  currentRoom = roomRes.data || null;
  secrets = secretsRes.data || [];
  guesses = guessesRes.data || [];
  scores = scoresRes.data || [];
  messages = messagesRes.data || [];
  rematchRequests = rematchRes.data || [];

  renderRoom();
}

function renderRoom() {
  if (!currentRoom) {
    setHomeMode();
    return;
  }

  roomCodeText.textContent = currentRoom.room_code;
  hostPlayerName.textContent = currentRoom.host_name || "Host";
  guestPlayerName.textContent = currentRoom.guest_name || "Waiting...";
  hostAvatar.textContent = getInitial(currentRoom.host_name || "H");
  guestAvatar.textContent = getInitial(currentRoom.guest_name || "G");

  hostReady.textContent = secrets.some(s => s.player_id === currentRoom.host_player_id) ? "Secret locked" : "Not ready";
  guestReady.textContent = currentRoom.guest_player_id
    ? (secrets.some(s => s.player_id === currentRoom.guest_player_id) ? "Secret locked" : "Not ready")
    : "Waiting for player";

  hostScore.textContent = String(getScore(currentRoom.host_player_id));
  guestScore.textContent = String(getScore(currentRoom.guest_player_id));

  hostCard.classList.toggle("active", currentRoom.current_turn_player_id === currentRoom.host_player_id);
  guestCard.classList.toggle("active", currentRoom.current_turn_player_id === currentRoom.guest_player_id);
  hostTurnBadge.classList.toggle("hidden", currentRoom.current_turn_player_id !== currentRoom.host_player_id);
  guestTurnBadge.classList.toggle("hidden", currentRoom.current_turn_player_id !== currentRoom.guest_player_id);
  inviteFriendsBtn?.classList.toggle("hidden", !!currentRoom.guest_player_id);
  if (summaryTurn) {
    summaryTurn.textContent = !currentRoom.guest_player_id
      ? "Waiting for opponent"
      : currentRoom.winner_player_id
        ? "Round finished"
        : isMyTurn()
          ? "Your turn"
          : `${getOpponentName()}'s turn`;
  }
  if (summaryOpponent) summaryOpponent.textContent = getOpponentName();
  if (summaryHostScore) summaryHostScore.textContent = String(getScore(currentRoom.host_player_id));
  if (summaryGuestScore) summaryGuestScore.textContent = String(getScore(currentRoom.guest_player_id));

  renderStatusBanner();
  renderPanels();
  renderHistory();
  renderChat();
  renderRematch();
  startTurnTimer();
}

function renderStatusBanner() {
  if (!currentRoom.guest_player_id) {
    statusBanner.textContent = "Waiting for opponent...";
    return;
  }
  if (currentRoom.winner_player_id) {
    const winnerName = currentRoom.winner_player_id === currentRoom.host_player_id
      ? currentRoom.host_name
      : currentRoom.guest_name;
    statusBanner.textContent = `${winnerName} won the round`;
    return;
  }
  if (!bothSecretsChosen()) {
    statusBanner.textContent = "Both players need to choose their secret number";
    return;
  }
  statusBanner.textContent = isMyTurn()
    ? `Your turn to guess ${getOpponentName()}'s number`
    : `${getOpponentName()}'s turn`;
}

function renderPanels() {
  const finished = !!currentRoom.winner_player_id;

  secretChooser.classList.toggle("hidden", finished || mySecretChosen());
  guessPanel.classList.toggle("hidden", finished || !bothSecretsChosen() || !isMyTurn());
  finishedPanel.classList.toggle("hidden", !finished);

  if (!finished) {
    const myGuessList = guesses.filter(g => g.guesser_player_id === playerId);
    const last = myGuessList[myGuessList.length - 1];
    lastHint.textContent = last ? `Last hint: ${getResultText(last.result)}` : "No hint yet.";
  } else {
    const winnerName = currentRoom.winner_player_id === currentRoom.host_player_id
      ? currentRoom.host_name
      : currentRoom.guest_name;
    winnerBanner.textContent = `🏆 ${winnerName} wins this round`;
  }

  playAgainBtn.classList.toggle("hidden", !isHost());
}

function renderHistory() {
  if (!guesses.length) {
    historyList.innerHTML = `<div class="empty">No guesses yet.</div>`;
    return;
  }

  historyList.innerHTML = guesses.slice().reverse().map(g => {
    const who = g.guesser_player_id === currentRoom.host_player_id ? currentRoom.host_name : (currentRoom.guest_name || "Guest");
    return `
      <div class="item">
        <strong>${escapeHtml(who)}</strong> guessed <strong>${g.guessed_number}</strong>
        <div style="color:#9eb1d9;margin-top:6px;">Result: ${getResultText(g.result)} • ${fmtTime(g.created_at)}</div>
      </div>
    `;
  }).join("");
}

function renderChat() {
  if (!messages.length) {
    chatMessages.innerHTML = `<div class="empty">No messages yet.</div>`;
    return;
  }

  const wasBottom = Math.abs(chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight) < 70;

  chatMessages.innerHTML = "";
  for (const msg of messages) {
    const div = document.createElement("div");
    div.className = `msg ${msg.player_id === playerId ? "me" : "other"}`;
    div.innerHTML = `
      <div class="msgName">${escapeHtml(msg.player_name)}</div>
      <div>${escapeHtml(msg.content)}</div>
      <div class="msgTime">${fmtTime(msg.created_at)}</div>
    `;
    chatMessages.appendChild(div);
  }

  const latest = messages[messages.length - 1];
  if (latest && latest.id !== lastRenderedMessageId && latest.player_id !== playerId) {
    playChatSound();
  }
  lastRenderedMessageId = latest?.id || null;

  if (wasBottom || messages.length <= 2) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function renderRematch() {
  if (!currentRoom.winner_player_id) {
    rematchBox.innerHTML = "";
    return;
  }

  if (!rematchRequests.length) {
    rematchBox.innerHTML = `<div>No rematch request yet.</div>`;
    return;
  }

  rematchBox.innerHTML = rematchRequests.map(r => `
    <div>${r.from_player_id === playerId ? "You" : getOpponentName()} requested a rematch.</div>
  `).join("");
}

// --------------------
// GAME ACTIONS
// --------------------
async function saveSecret() {
  if (!currentRoom) return;
  const num = Number(secretInput.value);
  if (!Number.isInteger(num) || num < 1 || num > 100) {
    showToast("Enter a number from 1 to 100.", true);
    return;
  }

  const { error } = await supabase.from("secrets").upsert({
    room_id: currentRoom.id,
    player_id: playerId,
    secret_number: num
  }, { onConflict: "room_id,player_id" });

  if (error) {
    showToast(error.message, true);
    return;
  }

  secretInput.value = "";

  const { data: roomSecrets } = await supabase
    .from("secrets")
    .select("*")
    .eq("room_id", currentRoom.id);

  if ((roomSecrets || []).length >= 2) {
    await supabase
      .from("rooms")
      .update({
        status: "playing",
        current_turn_player_id: currentRoom.host_player_id,
        turn_started_at: new Date().toISOString()
      })
      .eq("id", currentRoom.id);
  }

  await loadRoomBundle();
  showToast("Secret saved.");
}

async function makeGuess() {
  if (!currentRoom || !isMyTurn()) return;

  const num = Number(guessInput.value);
  if (!Number.isInteger(num) || num < 1 || num > 100) {
    showToast("Enter a number from 1 to 100.", true);
    return;
  }

  const targetId = getTargetIdForGuess();
  const targetSecret = secrets.find(s => s.player_id === targetId);
  if (!targetSecret) {
    showToast("Opponent secret not ready.", true);
    return;
  }

  let result = "low";
  if (num > targetSecret.secret_number) result = "high";
  if (num === targetSecret.secret_number) result = "correct";

  const nextTurn = targetId;

  await supabase.from("guesses").insert({
    room_id: currentRoom.id,
    guesser_player_id: playerId,
    target_player_id: targetId,
    guessed_number: num,
    result
  });

  if (result === "correct") {
    await finishRound(playerId);
  } else {
    await supabase.from("rooms").update({
      current_turn_player_id: nextTurn,
      turn_started_at: new Date().toISOString()
    }).eq("id", currentRoom.id);
  }

  guessInput.value = "";
  await loadRoomBundle();
}

async function finishRound(winnerPlayerId) {
  if (!currentRoom) return;

  await supabase
    .from("rooms")
    .update({
      winner_player_id: winnerPlayerId,
      status: "finished"
    })
    .eq("id", currentRoom.id);

  const winnerScore = getScore(winnerPlayerId) + 1;
  await supabase
    .from("scores")
    .update({ points: winnerScore })
    .eq("room_id", currentRoom.id)
    .eq("player_id", winnerPlayerId);

  const loserId = winnerPlayerId === currentRoom.host_player_id ? currentRoom.guest_player_id : currentRoom.host_player_id;

  if (winnerPlayerId) {
    const { data: winProfile } = await supabase.from("user_profiles").select("wins").eq("player_id", winnerPlayerId).maybeSingle();
    if (winProfile) {
      await supabase.from("user_profiles").update({ wins: (winProfile.wins || 0) + 1 }).eq("player_id", winnerPlayerId);
    }
  }

  if (loserId) {
    const { data: lossProfile } = await supabase.from("user_profiles").select("losses").eq("player_id", loserId).maybeSingle();
    if (lossProfile) {
      await supabase.from("user_profiles").update({ losses: (lossProfile.losses || 0) + 1 }).eq("player_id", loserId);
    }
  }

  await reloadMyProfile();
}

async function sendChat() {
  if (!currentRoom) return;
  const content = chatInput.value.trim();
  if (!content) return;

  const { error } = await supabase.from("messages").insert({
    room_id: currentRoom.id,
    player_id: playerId,
    player_name: getMyName(),
    content
  });

  if (error) {
    showToast(error.message, true);
    return;
  }

  chatInput.value = "";
}

async function requestRematch() {
  if (!currentRoom?.winner_player_id) return;
  const opponentId = getOpponentId();
  if (!opponentId) return;

  const { error } = await supabase.from("rematch_requests").upsert({
    room_id: currentRoom.id,
    from_player_id: playerId,
    to_player_id: opponentId,
    status: "pending"
  }, { onConflict: "room_id,from_player_id,to_player_id" });

  if (error) {
    showToast(error.message, true);
    return;
  }

  await checkStartRematch();
  showToast("Rematch requested.");
}

async function checkStartRematch() {
  if (!currentRoom) return;

  const { data } = await supabase
    .from("rematch_requests")
    .select("*")
    .eq("room_id", currentRoom.id)
    .eq("status", "pending");

  rematchRequests = data || [];

  const hostRequested = rematchRequests.some(r => r.from_player_id === currentRoom.host_player_id);
  const guestRequested = rematchRequests.some(r => r.from_player_id === currentRoom.guest_player_id);

  if (hostRequested && guestRequested) {
    await startNewRound();
  } else {
    renderRematch();
  }
}

async function startNewRound() {
  if (!currentRoom || !isHost()) return;

  await Promise.all([
    supabase.from("secrets").delete().eq("room_id", currentRoom.id),
    supabase.from("guesses").delete().eq("room_id", currentRoom.id),
    supabase.from("rematch_requests").delete().eq("room_id", currentRoom.id),
    supabase.from("rooms").update({
      status: "choosing",
      winner_player_id: null,
      current_turn_player_id: currentRoom.host_player_id,
      turn_started_at: new Date().toISOString()
    }).eq("id", currentRoom.id)
  ]);

  await loadRoomBundle();
  showToast("New round started.");
}

async function leaveRoom() {
  if (!currentRoom) return;

  clearTimer();
  clearRealtime();

  if (isHost()) {
    await Promise.all([
      supabase.from("messages").delete().eq("room_id", currentRoom.id),
      supabase.from("guesses").delete().eq("room_id", currentRoom.id),
      supabase.from("secrets").delete().eq("room_id", currentRoom.id),
      supabase.from("scores").delete().eq("room_id", currentRoom.id),
      supabase.from("rematch_requests").delete().eq("room_id", currentRoom.id),
      supabase.from("rooms").delete().eq("id", currentRoom.id)
    ]);
  } else {
    await Promise.all([
      supabase.from("messages").delete().eq("room_id", currentRoom.id).eq("player_id", playerId),
      supabase.from("guesses").delete().eq("room_id", currentRoom.id).eq("guesser_player_id", playerId),
      supabase.from("secrets").delete().eq("room_id", currentRoom.id).eq("player_id", playerId),
      supabase.from("scores").delete().eq("room_id", currentRoom.id).eq("player_id", playerId),
      supabase.from("rematch_requests").delete().eq("room_id", currentRoom.id).or(`from_player_id.eq.${playerId},to_player_id.eq.${playerId}`),
      supabase.from("rooms").update({
        guest_name: null,
        guest_player_id: null,
        status: "waiting",
        winner_player_id: null,
        current_turn_player_id: currentRoom.host_player_id,
        turn_started_at: new Date().toISOString()
      }).eq("id", currentRoom.id)
    ]);
  }

  currentRoom = null;
  secrets = [];
  guesses = [];
  scores = [];
  messages = [];
  rematchRequests = [];

  setHomeMode();
  await loadHomeData();
  subscribeHomeRealtime();
  showToast("Left room.");
}

async function handleTimeout() {
  if (!currentRoom || !isMyTurn() || currentRoom.winner_player_id) return;

  const nextTurn = getOpponentId();
  if (!nextTurn) return;

  await supabase.from("guesses").insert({
    room_id: currentRoom.id,
    guesser_player_id: playerId,
    target_player_id: nextTurn,
    guessed_number: 0,
    result: "timeout"
  });

  await supabase.from("rooms").update({
    current_turn_player_id: nextTurn,
    turn_started_at: new Date().toISOString()
  }).eq("id", currentRoom.id);
}

// --------------------
// TIMER
// --------------------
function clearTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function startTurnTimer() {
  clearTimer();

  if (!currentRoom || !bothSecretsChosen() || currentRoom.winner_player_id) {
    timerText.textContent = "--";
    timerText.classList.remove("activeTimer", "urgentTimer");
    return;
  }

  const tick = () => {
    const start = new Date(currentRoom.turn_started_at).getTime();
    const now = Date.now();
    const left = Math.max(0, 10 - Math.floor((now - start) / 1000));
    timerText.textContent = `${left}s`;
    timerText.classList.toggle("activeTimer", isMyTurn());
    timerText.classList.toggle("urgentTimer", left <= 3 && left > 0);

    if (timerRingProgress) {
      const radius = 30;
      const circumference = 2 * Math.PI * radius;
      timerRingProgress.style.strokeDasharray = `${circumference} ${circumference}`;
      timerRingProgress.style.strokeDashoffset = `${circumference * (1 - left / 10)}`;
    }

    if (left <= 0) {
      clearTimer();
      timerText.classList.remove("activeTimer", "urgentTimer");
      if (timerRingProgress) {
        const radius = 30;
        const circumference = 2 * Math.PI * radius;
        timerRingProgress.style.strokeDashoffset = `${circumference}`;
      }
      if (isMyTurn()) handleTimeout();
    }
  };

  tick();
  timerInterval = setInterval(tick, 1000);
}

// --------------------
// REALTIME
// --------------------
function clearRealtime() {
  for (const ch of realtimeChannels) supabase.removeChannel(ch);
  realtimeChannels = [];
}

function subscribeHomeRealtime() {
  const channel = supabase.channel(`home-${playerId}`);

  channel
    .on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, () => loadFriends())
    .on("postgres_changes", { event: "*", schema: "public", table: "friends" }, () => loadFriends())
    .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => loadFriendRequests())
    .on("postgres_changes", { event: "*", schema: "public", table: "game_invites" }, () => loadInvites())
    .subscribe();

  realtimeChannels.push(channel);
}

function subscribeRoomRealtime(roomId) {
  const channel = supabase.channel(`room-${roomId}`);

  channel
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => loadRoomBundle(roomId))
    .on("postgres_changes", { event: "*", schema: "public", table: "secrets", filter: `room_id=eq.${roomId}` }, () => loadRoomBundle(roomId))
    .on("postgres_changes", { event: "*", schema: "public", table: "guesses", filter: `room_id=eq.${roomId}` }, () => loadRoomBundle(roomId))
    .on("postgres_changes", { event: "*", schema: "public", table: "scores", filter: `room_id=eq.${roomId}` }, () => loadRoomBundle(roomId))
    .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, () => loadRoomBundle(roomId))
    .on("postgres_changes", { event: "*", schema: "public", table: "rematch_requests", filter: `room_id=eq.${roomId}` }, () => loadRoomBundle(roomId))
    .subscribe();

  realtimeChannels.push(channel);
}

// --------------------
// EVENTS
// --------------------
saveProfileBtn.onclick = saveProfile;
createRoomBtn.onclick = createRoom;
joinRoomBtn.onclick = joinRoom;
addFriendBtn.onclick = addFriend;
copyCodeBtn.onclick = async () => {
  if (!currentRoom) return;
  await navigator.clipboard.writeText(currentRoom.room_code);
  showToast("Room code copied.");
};
leaveRoomBtn.onclick = leaveRoom;
saveSecretBtn.onclick = saveSecret;
guessBtn.onclick = makeGuess;
sendChatBtn.onclick = sendChat;
requestRematchBtn.onclick = requestRematch;
playAgainBtn.onclick = startNewRound;
inviteFriendsBtn?.addEventListener("click", () => {
  if (gameFriendsList) {
    gameFriendsList.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});
guessInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") makeGuess();
});
secretInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveSecret();
});

profileBtn.onclick = () => profileCard.classList.toggle("hidden");
soundToggleBtn.onclick = () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("guess_duel_sound", soundEnabled);
  soundToggleBtn.classList.toggle("muted", !soundEnabled);
  soundToggleBtn.textContent = soundEnabled ? "🔊" : "🔇";
};

// Initialize sound button
soundToggleBtn.classList.toggle("muted", !soundEnabled);
soundToggleBtn.textContent = soundEnabled ? "🔊" : "🔇";

document.addEventListener("click", (e) => {
  if (!profileBtn.contains(e.target) && !profileCard.contains(e.target)) {
    profileCard.classList.add("hidden");
  }
});

document.addEventListener("pointerdown", () => {
  try { ensureAudio(); } catch {}
}, { once: true });

window.addEventListener("beforeunload", () => {
  setPresence(false);
});

// --------------------
// INIT
// --------------------
async function init() {
  setHomeMode();
  subscribeHomeRealtime();

  // show popup immediately if no saved cookie
  const cookieUsername = getCookie("guess_duel_username");
  const cookieDisplay = getCookie("guess_duel_display_name");

  if (!cookieUsername || !cookieDisplay) {
    profileModal.classList.remove("hidden");
  }

  await ensureProfileBootstrapped();
  await reloadMyProfile();
  await loadHomeData();

  const lastRoomCode = localStorage.getItem("guess_duel_last_room");
  if (lastRoomCode) {
    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", lastRoomCode)
      .maybeSingle();

    if (room && (room.host_player_id === playerId || room.guest_player_id === playerId)) {
      currentRoom = room;
      await openRoom(room.id);
    }
  }
}

const originalOpenRoom = openRoom;
openRoom = async function(roomId) {
  await originalOpenRoom(roomId);
  if (currentRoom?.room_code) localStorage.setItem("guess_duel_last_room", currentRoom.room_code);
};

init();
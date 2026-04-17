import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fmcmnwoopbmitqufaoys.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6jC-frTceZf32cL3ZUAOqA_q5lGRM6K';



const $ = (id) => document.getElementById(id);

// Core UI
const notice = $('notice');
const homeScreen = $('homeScreen');
const gameScreen = $('gameScreen');

// Profile modal
const usernameModal = $('usernameModal');
const profileUsername = $('profileUsername');
const profileDisplayName = $('profileDisplayName');
const saveProfileBtn = $('saveProfileBtn');

// Top profile UI
const profileButton = $('profileButton');
const profileHoverCard = $('profileHoverCard');
const profileAvatarTop = $('profileAvatarTop');
const profileNameTop = $('profileNameTop');
const profileAvatarLarge = $('profileAvatarLarge');
const profileDisplayNameText = $('profileDisplayNameText');
const profileUsernameText = $('profileUsernameText');
const profileWins = $('profileWins');
const profileLosses = $('profileLosses');
const profileOnlineText = $('profileOnlineText');

// Home form
const hostName = $('hostName');
const joinName = $('joinName');
const joinCode = $('joinCode');
const createRoomBtn = $('createRoomBtn');
const joinRoomBtn = $('joinRoomBtn');

// Friends + requests + invites
const friendUsernameInput = $('friendUsernameInput');
const addFriendBtn = $('addFriendBtn');
const friendsList = $('friendsList');
const inviteList = $('inviteList');
const incomingFriendRequests = $('incomingFriendRequests');
const outgoingFriendRequests = $('outgoingFriendRequests');

// Game topbar
const copyCodeBtn = $('copyCodeBtn');
const leaveRoomBtn = $('leaveRoomBtn');
const roomCodeText = $('roomCodeText');
const statusPill = $('statusPill');
const gameMessage = $('gameMessage');

// Players
const hostCard = $('hostCard');
const guestCard = $('guestCard');
const hostTurnBadge = $('hostTurnBadge');
const guestTurnBadge = $('guestTurnBadge');
const hostPlayerName = $('hostPlayerName');
const guestPlayerName = $('guestPlayerName');
const hostReady = $('hostReady');
const guestReady = $('guestReady');
const hostAvatar = $('hostAvatar');
const guestAvatar = $('guestAvatar');
const hostScore = $('hostScore');
const guestScore = $('guestScore');

// Game panels
const secretChooser = $('secretChooser');
const guessPanel = $('guessPanel');
const finishedPanel = $('finishedPanel');
const secretInput = $('secretInput');
const saveSecretBtn = $('saveSecretBtn');
const guessInput = $('guessInput');
const guessBtn = $('guessBtn');
const lastHint = $('lastHint');
const winnerBanner = $('winnerBanner');
const playAgainBtn = $('playAgainBtn');
const requestRematchBtn = $('requestRematchBtn');
const rematchBox = $('rematchBox');

// History + room chat
const historyList = $('historyList');
const chatMessages = $('chatMessages');
const chatInput = $('chatInput');
const sendChatBtn = $('sendChatBtn');

// State
let playerId = getOrCreatePlayerId();
let currentRoom = null;
let secrets = [];
let guesses = [];
let messages = [];
let scores = [];
let myProfile = null;
let friends = [];
let invites = [];
let incomingRequests = [];
let outgoingRequests = [];
let rematchRequests = [];

let roomChannel = null;
let socialChannel = null;
let roomPoller = null;
let socialPoller = null;
let isLoadingRoom = false;

// turn timer
let turnInterval = null;
let turnSecondsLeft = 10;
let lastTurnKey = '';

// audio
let audioCtx = null;
let hasUnlockedAudio = false;

// ---------- Cookie helpers ----------
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const target = encodeURIComponent(name) + '=';
  const parts = document.cookie.split('; ');
  for (const part of parts) {
    if (part.startsWith(target)) {
      return decodeURIComponent(part.substring(target.length));
    }
  }
  return '';
}

// ---------- Generic helpers ----------
function getOrCreatePlayerId() {
  let id = localStorage.getItem('guess_duel_player_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('guess_duel_player_id', id);
  }
  return id;
}

function showNotice(text, isError = false) {
  notice.textContent = text;
  notice.classList.remove('hidden');
  notice.style.background = isError ? 'rgba(251, 113, 133, 0.12)' : 'rgba(79, 140, 255, 0.12)';
  notice.style.borderColor = isError ? 'rgba(251, 113, 133, 0.35)' : '#36528a';
}

function hideNotice() {
  notice.classList.add('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function getInitial(name) {
  if (!name || !name.trim()) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function setHomeScreen() {
  homeScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
}

function setGameScreen() {
  homeScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

function isHost() {
  return !!currentRoom && currentRoom.host_player_id === playerId;
}

function getMyName() {
  if (myProfile?.display_name) return myProfile.display_name;
  if (!currentRoom) return hostName.value.trim() || joinName.value.trim() || 'Player';
  return isHost() ? currentRoom.host_name : (currentRoom.guest_name || 'Guest');
}

function getOpponentId() {
  if (!currentRoom) return null;
  return isHost() ? currentRoom.guest_player_id : currentRoom.host_player_id;
}

function getOpponentName() {
  if (!currentRoom) return 'Opponent';
  return isHost() ? (currentRoom.guest_name || 'Guest') : currentRoom.host_name;
}

function mySecretChosen() {
  return secrets.some((s) => s.player_id === playerId);
}

function isMyTurn() {
  return !!currentRoom && currentRoom.current_turn_player_id === playerId;
}

function getWinnerName() {
  if (!currentRoom || !currentRoom.winner_player_id) return '';
  return currentRoom.winner_player_id === currentRoom.host_player_id
    ? currentRoom.host_name
    : (currentRoom.guest_name || 'Guest');
}

function getScoreForPlayer(playerIdToFind) {
  const row = scores.find((s) => s.player_id === playerIdToFind);
  return row ? row.points : 0;
}

function onlineLabel(profile) {
  return profile?.is_online ? 'Online' : 'Offline';
}

function onlineDot(profile) {
  return `<span class="onlineDot ${profile?.is_online ? 'online' : 'offline'}"></span>`;
}

// ---------- Audio ----------
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  hasUnlockedAudio = true;
}

function playChatSound() {
  try {
    ensureAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(740, now);
    osc1.frequency.exponentialRampToValueAtTime(980, now + 0.08);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(980, now + 0.09);
    osc2.frequency.exponentialRampToValueAtTime(1240, now + 0.16);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    gain2.gain.setValueAtTime(0.0001, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.025, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc1.connect(gain1).connect(audioCtx.destination);
    osc2.connect(gain2).connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.1);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.19);
  } catch (e) {
    // ignore audio errors
  }
}

function unlockAudioFromInteraction() {
  try {
    ensureAudio();
  } catch (e) {
    // ignore
  }
}

// ---------- Presence ----------
async function setPresenceOnline(isOnline) {
  await supabase
    .from('user_profiles')
    .update({
      is_online: isOnline,
      last_seen_at: new Date().toISOString()
    })
    .eq('player_id', playerId);
}

// ---------- Profile ----------
function renderProfile() {
  if (!myProfile) return;

  const initial = getInitial(myProfile.display_name);
  profileAvatarTop.textContent = initial;
  profileNameTop.textContent = myProfile.display_name;
  profileAvatarLarge.textContent = initial;
  profileDisplayNameText.textContent = myProfile.display_name;
  profileUsernameText.textContent = '@' + myProfile.username;
  profileWins.textContent = String(myProfile.wins || 0);
  profileLosses.textContent = String(myProfile.losses || 0);
  profileOnlineText.innerHTML = `${onlineDot(myProfile)}${onlineLabel(myProfile)}`;

  hostName.value = myProfile.display_name;
  joinName.value = myProfile.display_name;
}

async function loadMyProfile() {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();

  myProfile = data || null;
  if (myProfile) renderProfile();
}

async function saveProfile() {
  const username = profileUsername.value.trim().toLowerCase();
  const displayName = profileDisplayName.value.trim();

  if (!username || !displayName) {
    showNotice('Enter username and display name.', true);
    return;
  }

  saveProfileBtn.disabled = true;

  try {
    const { data: existingUsername } = await supabase
      .from('user_profiles')
      .select('player_id')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername && existingUsername.player_id !== playerId) {
      showNotice('Username already taken.', true);
      return;
    }

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingProfile) {
      await supabase
        .from('user_profiles')
        .update({
          username,
          display_name: displayName,
          is_online: true,
          last_seen_at: new Date().toISOString()
        })
        .eq('player_id', playerId);
    } else {
      await supabase.from('user_profiles').insert({
        player_id: playerId,
        username,
        display_name: displayName,
        wins: 0,
        losses: 0,
        is_online: true,
        last_seen_at: new Date().toISOString()
      });
    }

    setCookie('guess_duel_username', username);
    setCookie('guess_duel_display_name', displayName);

    await loadMyProfile();
    usernameModal.classList.add('hidden');
    hideNotice();
  } finally {
    saveProfileBtn.disabled = false;
  }
}

// ---------- Friends ----------
async function loadFriends() {
  const { data: links } = await supabase
    .from('friends')
    .select('friend_player_id')
    .eq('player_id', playerId);

  const friendIds = (links || []).map((x) => x.friend_player_id);

  if (!friendIds.length) {
    friends = [];
    renderFriends();
    return;
  }

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .in('player_id', friendIds);

  friends = profiles || [];
  renderFriends();
}

function renderFriends() {
  if (!friends.length) {
    friendsList.innerHTML = '<div class="empty">No friends added yet.</div>';
    return;
  }

  friendsList.innerHTML = friends.map((f) => `
    <div class="historyItem">
      <div class="friendRowTop">
        <div>
          <strong>${escapeHtml(f.display_name)}</strong>
          <span style="color:#9fb2d9;"> @${escapeHtml(f.username)}</span>
        </div>
        <div class="friendStatusText">${onlineDot(f)}${onlineLabel(f)}</div>
      </div>
      <div style="margin-top:10px;">
        <button class="btn primary inviteFriendBtn" data-player-id="${f.player_id}">
          Invite to Game
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.inviteFriendBtn').forEach((btn) => {
    btn.addEventListener('click', () => inviteFriend(btn.dataset.playerId));
  });
}

// ---------- Friend requests ----------
async function addFriend() {
  const username = friendUsernameInput.value.trim().toLowerCase();
  if (!username) return;

  if (!myProfile) {
    showNotice('Save your profile first.', true);
    return;
  }

  addFriendBtn.disabled = true;

  try {
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('player_id, username, display_name')
      .eq('username', username)
      .maybeSingle();

    if (!targetProfile) {
      showNotice('Username not found.', true);
      return;
    }

    if (targetProfile.player_id === playerId) {
      showNotice('You cannot add yourself.', true);
      return;
    }

    const { data: existingFriend } = await supabase
      .from('friends')
      .select('id')
      .eq('player_id', playerId)
      .eq('friend_player_id', targetProfile.player_id)
      .maybeSingle();

    if (existingFriend) {
      showNotice('Already friends.', true);
      return;
    }

    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id,status')
      .eq('from_player_id', playerId)
      .eq('to_player_id', targetProfile.player_id)
      .maybeSingle();

    if (existingRequest && existingRequest.status === 'pending') {
      showNotice('Friend request already sent.', true);
      return;
    }

    await supabase.from('friend_requests').upsert({
      from_player_id: playerId,
      from_username: myProfile.username,
      to_player_id: targetProfile.player_id,
      status: 'pending'
    });

    friendUsernameInput.value = '';
    await loadFriendRequests();
    showNotice('Friend request sent.');
  } finally {
    addFriendBtn.disabled = false;
  }
}

async function loadFriendRequests() {
  const [incomingRes, outgoingRes] = await Promise.all([
    supabase
      .from('friend_requests')
      .select('*')
      .eq('to_player_id', playerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('friend_requests')
      .select('*')
      .eq('from_player_id', playerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
  ]);

  incomingRequests = incomingRes.data || [];
  outgoingRequests = outgoingRes.data || [];

  renderFriendRequests();
}

function renderFriendRequests() {
  if (!incomingRequests.length) {
    incomingFriendRequests.innerHTML = '<div class="empty">No requests yet.</div>';
  } else {
    incomingFriendRequests.innerHTML = incomingRequests.map((req) => `
      <div class="historyItem">
        <strong>@${escapeHtml(req.from_username)}</strong> sent you a friend request
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn secondary acceptFriendBtn" data-id="${req.id}" data-from="${req.from_player_id}">Accept</button>
          <button class="btn danger declineFriendBtn" data-id="${req.id}">Decline</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.acceptFriendBtn').forEach((btn) => {
      btn.addEventListener('click', () => acceptFriendRequest(btn.dataset.id, btn.dataset.from));
    });

    document.querySelectorAll('.declineFriendBtn').forEach((btn) => {
      btn.addEventListener('click', () => declineFriendRequest(btn.dataset.id));
    });
  }

  if (!outgoingRequests.length) {
    outgoingFriendRequests.innerHTML = '<div class="empty">No outgoing requests.</div>';
  } else {
    outgoingFriendRequests.innerHTML = outgoingRequests.map((req) => `
      <div class="historyItem">
        Friend request sent
        <div style="color:#9fb2d9;margin-top:8px;">Waiting for approval</div>
      </div>
    `).join('');
  }
}

async function acceptFriendRequest(requestId, fromPlayerId) {
  await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  await supabase.from('friends').insert([
    { player_id: playerId, friend_player_id: fromPlayerId },
    { player_id: fromPlayerId, friend_player_id: playerId }
  ]);

  await Promise.all([loadFriendRequests(), loadFriends()]);
  showNotice('Friend request accepted.');
}

async function declineFriendRequest(requestId) {
  await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);

  await loadFriendRequests();
}

// ---------- Invites ----------
async function inviteFriend(friendPlayerId) {
  if (!currentRoom) {
    showNotice('Create a room first, then invite a friend.', true);
    return;
  }

  if (!myProfile) {
    showNotice('Profile not loaded.', true);
    return;
  }

  await supabase.from('game_invites').insert({
    from_player_id: playerId,
    from_username: myProfile.username,
    to_player_id: friendPlayerId,
    room_code: currentRoom.room_code,
    status: 'pending'
  });

  showNotice('Invite sent.');
}

async function loadInvites() {
  const { data } = await supabase
    .from('game_invites')
    .select('*')
    .eq('to_player_id', playerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  invites = data || [];
  renderInvites();
}

function renderInvites() {
  if (!invites.length) {
    inviteList.innerHTML = '<div class="empty">No invites yet.</div>';
    return;
  }

  inviteList.innerHTML = invites.map((inv) => `
    <div class="historyItem">
      <strong>@${escapeHtml(inv.from_username)}</strong> invited you to room <strong>${escapeHtml(inv.room_code)}</strong>
      <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn secondary acceptInviteBtn" data-id="${inv.id}" data-room="${inv.room_code}">Accept</button>
        <button class="btn danger declineInviteBtn" data-id="${inv.id}">Decline</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.acceptInviteBtn').forEach((btn) => {
    btn.addEventListener('click', () => acceptInvite(btn.dataset.id, btn.dataset.room));
  });

  document.querySelectorAll('.declineInviteBtn').forEach((btn) => {
    btn.addEventListener('click', () => declineInvite(btn.dataset.id));
  });
}

async function acceptInvite(inviteId, roomCode) {
  await supabase
    .from('game_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId);

  joinCode.value = roomCode;
  joinName.value = myProfile?.display_name || joinName.value;
  await joinRoom();
  await loadInvites();
}

async function declineInvite(inviteId) {
  await supabase
    .from('game_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId);

  await loadInvites();
}

// ---------- Game rendering ----------
function resetPanels() {
  secretChooser.classList.add('hidden');
  guessPanel.classList.add('hidden');
  finishedPanel.classList.add('hidden');
  lastHint.classList.add('hidden');
  rematchBox.classList.add('hidden');
}

function stopTurnTimer() {
  if (turnInterval) {
    clearInterval(turnInterval);
    turnInterval = null;
  }
}

async function timeoutCurrentTurn() {
  if (!currentRoom || currentRoom.status !== 'playing') return;

  const currentTurnPlayer = currentRoom.current_turn_player_id;
  if (!currentTurnPlayer) return;

  const nextPlayer =
    currentTurnPlayer === currentRoom.host_player_id
      ? currentRoom.guest_player_id
      : currentRoom.host_player_id;

  if (!nextPlayer) return;

  await supabase
    .from('rooms')
    .update({
      current_turn_player_id: nextPlayer
    })
    .eq('id', currentRoom.id);

  showNotice('Time is up. Turn switched automatically.');
}

function startTurnTimerIfNeeded() {
  stopTurnTimer();

  if (!currentRoom || currentRoom.status !== 'playing') return;
  if (!currentRoom.current_turn_player_id) return;

  const turnKey = `${currentRoom.id}:${currentRoom.current_turn_player_id}:${currentRoom.status}`;
  if (lastTurnKey !== turnKey) {
    turnSecondsLeft = 10;
    lastTurnKey = turnKey;
  }

  turnInterval = setInterval(async () => {
    if (!currentRoom || currentRoom.status !== 'playing') {
      stopTurnTimer();
      return;
    }

    turnSecondsLeft -= 1;

    if (turnSecondsLeft <= 0) {
      stopTurnTimer();
      turnSecondsLeft = 0;
      updateStatusBannerText();
      await timeoutCurrentTurn();
      return;
    }

    updateStatusBannerText();
  }, 1000);
}

function updateStatusBannerText() {
  if (!currentRoom) return;

  if (currentRoom.status === 'waiting') {
    statusPill.textContent = 'Waiting for Player';
    return;
  }

  if (currentRoom.status === 'choosing') {
    statusPill.textContent = mySecretChosen()
      ? 'Secret Locked • Waiting Opponent'
      : 'Choose Your Secret Number';
    return;
  }

  if (currentRoom.status === 'playing') {
    if (isMyTurn()) {
      statusPill.textContent = `Your Turn • ${turnSecondsLeft}s left`;
    } else {
      statusPill.textContent = `${getOpponentName()} Turn • ${turnSecondsLeft}s left`;
    }
    return;
  }

  if (currentRoom.status === 'finished') {
    statusPill.textContent = `${getWinnerName()} Won the Round`;
  }
}

function renderPlayers() {
  hostPlayerName.textContent = currentRoom.host_name;
  guestPlayerName.textContent = currentRoom.guest_name || 'Waiting...';

  hostAvatar.textContent = getInitial(currentRoom.host_name);
  guestAvatar.textContent = getInitial(currentRoom.guest_name || 'G');

  hostReady.textContent = secrets.some((s) => s.player_id === currentRoom.host_player_id)
    ? 'Secret locked'
    : 'Not ready';

  if (!currentRoom.guest_player_id) {
    guestReady.textContent = 'Not joined';
  } else {
    guestReady.textContent = secrets.some((s) => s.player_id === currentRoom.guest_player_id)
      ? 'Secret locked'
      : 'Not ready';
  }

  hostScore.textContent = String(getScoreForPlayer(currentRoom.host_player_id));
  guestScore.textContent = String(currentRoom.guest_player_id ? getScoreForPlayer(currentRoom.guest_player_id) : 0);

  hostCard.classList.toggle('active', currentRoom.current_turn_player_id === currentRoom.host_player_id);
  guestCard.classList.toggle('active', currentRoom.current_turn_player_id === currentRoom.guest_player_id);

  hostTurnBadge.classList.toggle('hidden', currentRoom.current_turn_player_id !== currentRoom.host_player_id);
  guestTurnBadge.classList.toggle('hidden', currentRoom.current_turn_player_id !== currentRoom.guest_player_id);
}

function renderHistory() {
  if (!guesses.length) {
    historyList.innerHTML = '<div class="empty">No guesses yet.</div>';
    return;
  }

  const sorted = [...guesses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  historyList.innerHTML = sorted.map((g) => {
    const guesserName = g.guesser_player_id === currentRoom.host_player_id
      ? currentRoom.host_name
      : (currentRoom.guest_name || 'Guest');

    return `
      <div class="historyItem">
        <strong>${escapeHtml(guesserName)}</strong>
        guessed <strong>${g.guessed_number}</strong>
        → <strong>${g.result.toUpperCase()}</strong>
      </div>
    `;
  }).join('');
}

function renderMessages() {
  if (!messages.length) {
    chatMessages.innerHTML = '<div class="empty">No messages yet.</div>';
    return;
  }

  chatMessages.innerHTML = messages.map((m) => `
    <div class="chatBubble ${m.player_id === playerId ? 'mine' : ''}">
      <div class="chatName">${escapeHtml(m.player_name)}</div>
      <div>${escapeHtml(m.content)}</div>
    </div>
  `).join('');

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderHint() {
  const myGuesses = guesses
    .filter((g) => g.guesser_player_id === playerId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const latest = myGuesses[0];
  if (!latest || currentRoom.status !== 'playing') {
    lastHint.classList.add('hidden');
    lastHint.textContent = '';
    return;
  }

  lastHint.classList.remove('hidden');

  if (latest.result === 'higher') {
    lastHint.textContent = `Hint: go higher than ${latest.guessed_number}.`;
  } else if (latest.result === 'lower') {
    lastHint.textContent = `Hint: go lower than ${latest.guessed_number}.`;
  } else {
    lastHint.textContent = 'Correct!';
  }
}

function renderRematchBox() {
  if (currentRoom?.status !== 'finished') return;

  const opponentId = getOpponentId();
  const incoming = rematchRequests.find((r) => r.to_player_id === playerId && r.status === 'pending');
  const outgoing = rematchRequests.find((r) => r.from_player_id === playerId && r.status === 'pending');

  if (incoming) {
    rematchBox.classList.remove('hidden');
    rematchBox.innerHTML = `
      Opponent requested a rematch.
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">
        <button id="acceptRematchBtn" class="btn secondary">Accept Rematch</button>
        <button id="declineRematchBtn" class="btn danger">Decline</button>
      </div>
    `;
    $('acceptRematchBtn').addEventListener('click', () => acceptRematch(incoming.id));
    $('declineRematchBtn').addEventListener('click', () => declineRematch(incoming.id));
    requestRematchBtn.disabled = true;
    return;
  }

  if (outgoing) {
    rematchBox.classList.remove('hidden');
    rematchBox.textContent = 'Rematch request sent. Waiting for opponent.';
    requestRematchBtn.disabled = true;
    return;
  }

  if (opponentId) {
    requestRematchBtn.disabled = false;
  }
}

function renderGameState() {
  resetPanels();
  renderPlayers();
  renderHistory();
  renderMessages();
  renderHint();

  roomCodeText.textContent = currentRoom.room_code;
  updateStatusBannerText();

  if (currentRoom.status === 'waiting') {
    gameMessage.textContent = 'Waiting for another player to join the room.';
    stopTurnTimer();
    return;
  }

  if (currentRoom.status === 'choosing') {
    if (!mySecretChosen()) {
      gameMessage.textContent = 'Choose your secret number from 1 to 100.';
      secretChooser.classList.remove('hidden');
      saveSecretBtn.disabled = false;
      secretInput.disabled = false;
    } else {
      gameMessage.textContent = 'Your number is locked. Waiting for the other player.';
      secretChooser.classList.add('hidden');
      saveSecretBtn.disabled = true;
      secretInput.disabled = true;
    }
    stopTurnTimer();
    return;
  }

  if (currentRoom.status === 'playing') {
    guessPanel.classList.remove('hidden');
    startTurnTimerIfNeeded();

    if (isMyTurn()) {
      gameMessage.textContent = `Your turn. Guess ${getOpponentName()}'s number.`;
      guessInput.disabled = false;
      guessBtn.disabled = false;
    } else {
      gameMessage.textContent = `${getOpponentName()} is taking their turn.`;
      guessInput.disabled = true;
      guessBtn.disabled = true;
    }

    return;
  }

  if (currentRoom.status === 'finished') {
    stopTurnTimer();
    gameMessage.textContent = `${getWinnerName()} guessed correctly.`;
    finishedPanel.classList.remove('hidden');
    winnerBanner.textContent = `Winner: ${getWinnerName()}`;
    renderRematchBox();
  }
}

function render() {
  if (!currentRoom) {
    setHomeScreen();
    stopTurnTimer();
    return;
  }

  setGameScreen();
  renderGameState();
}

// ---------- Room data loading ----------
async function loadRoomData(roomId) {
  if (isLoadingRoom) return;
  isLoadingRoom = true;

  try {
    const [roomRes, secretsRes, guessesRes, messagesRes, scoresRes, rematchRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase.from('secrets').select('*').eq('room_id', roomId),
      supabase.from('guesses').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
      supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
      supabase.from('scores').select('*').eq('room_id', roomId),
      supabase.from('rematch_requests').select('*').eq('room_id', roomId)
    ]);

    if (roomRes.error) {
      showNotice(roomRes.error.message, true);
      return;
    }

    currentRoom = roomRes.data;
    secrets = secretsRes.data || [];
    guesses = guessesRes.data || [];
    messages = messagesRes.data || [];
    scores = scoresRes.data || [];
    rematchRequests = rematchRes.data || [];

    render();
  } finally {
    isLoadingRoom = false;
  }
}

async function loadRoomMessagesOnly(roomId) {
  const previousCount = messages.length;

  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  messages = data || [];
  renderMessages();

  const newest = messages[messages.length - 1];
  if (messages.length > previousCount && newest && newest.player_id !== playerId && hasUnlockedAudio) {
    playChatSound();
  }
}

async function loadRoomGuessesOnly(roomId) {
  const { data } = await supabase
    .from('guesses')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  guesses = data || [];
  renderHistory();
  renderHint();
}

// ---------- Polling / subscriptions ----------
function startRoomPolling(roomId) {
  stopRoomPolling();
  roomPoller = setInterval(() => {
    if (currentRoom?.id === roomId) {
      loadRoomData(roomId);
    }
  }, 5000);
}

function stopRoomPolling() {
  if (roomPoller) {
    clearInterval(roomPoller);
    roomPoller = null;
  }
}

function startSocialPolling() {
  stopSocialPolling();
  socialPoller = setInterval(() => {
    loadMyProfile();
    loadFriends();
    loadFriendRequests();
    loadInvites();
  }, 12000);
}

function stopSocialPolling() {
  if (socialPoller) {
    clearInterval(socialPoller);
    socialPoller = null;
  }
}

async function subscribeSocialRealtime() {
  if (socialChannel) {
    await supabase.removeChannel(socialChannel);
    socialChannel = null;
  }

  socialChannel = supabase
    .channel('social-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => loadFriends())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => loadFriendRequests())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invites' }, () => loadInvites())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
      loadMyProfile();
      loadFriends();
    })
    .subscribe();

  startSocialPolling();
}

async function subscribeToRoom(roomId) {
  if (roomChannel) {
    await supabase.removeChannel(roomChannel);
    roomChannel = null;
  }

  roomChannel = supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'secrets', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guesses', filter: `room_id=eq.${roomId}` }, () => loadRoomGuessesOnly(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, () => loadRoomMessagesOnly(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rematch_requests', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .subscribe();

  await loadRoomData(roomId);
  startRoomPolling(roomId);
}

// ---------- Room lifecycle ----------
async function createRoom() {
  hideNotice();
  unlockAudioFromInteraction();

  if (!myProfile) {
    showNotice('Save your profile first.', true);
    return;
  }

  const name = myProfile.display_name || hostName.value.trim();
  if (!name) {
    showNotice('Enter your name first.', true);
    return;
  }

  createRoomBtn.disabled = true;

  try {
    const room_code = generateRoomCode();

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_code,
        host_name: name,
        host_player_id: playerId,
        status: 'waiting'
      })
      .select()
      .single();

    if (error) {
      showNotice(error.message, true);
      return;
    }

    const { data: existingScore } = await supabase
      .from('scores')
      .select('id')
      .eq('room_id', data.id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (!existingScore) {
      await supabase.from('scores').insert({
        room_id: data.id,
        player_id: playerId,
        points: 0
      });
    }

    await subscribeToRoom(data.id);
    showNotice('Room created. Share the code with your friend.');
  } finally {
    createRoomBtn.disabled = false;
  }
}

async function joinRoom() {
  hideNotice();
  unlockAudioFromInteraction();

  if (!myProfile) {
    showNotice('Save your profile first.', true);
    return;
  }

  const name = myProfile.display_name || joinName.value.trim();
  const code = joinCode.value.trim().toUpperCase();

  if (!name || !code) {
    showNotice('Enter your name and room code.', true);
    return;
  }

  joinRoomBtn.disabled = true;

  try {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', code)
      .single();

    if (roomError || !room) {
      showNotice('Room not found.', true);
      return;
    }

    if (room.guest_player_id && room.guest_player_id !== playerId) {
      showNotice('Room is already full.', true);
      return;
    }

    const { data, error } = await supabase
      .from('rooms')
      .update({
        guest_name: name,
        guest_player_id: playerId,
        status: 'choosing'
      })
      .eq('id', room.id)
      .select()
      .single();

    if (error) {
      showNotice(error.message, true);
      return;
    }

    const { data: existingScore } = await supabase
      .from('scores')
      .select('id')
      .eq('room_id', data.id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (!existingScore) {
      await supabase.from('scores').insert({
        room_id: data.id,
        player_id: playerId,
        points: 0
      });
    }

    await subscribeToRoom(data.id);
    showNotice('Joined room. Choose your secret number.');
  } finally {
    joinRoomBtn.disabled = false;
  }
}

async function leaveRoom() {
  if (roomChannel) {
    await supabase.removeChannel(roomChannel);
    roomChannel = null;
  }

  stopRoomPolling();
  stopTurnTimer();

  currentRoom = null;
  secrets = [];
  guesses = [];
  messages = [];
  scores = [];
  rematchRequests = [];
  lastTurnKey = '';
  turnSecondsLeft = 10;

  setHomeScreen();
  hideNotice();
}

async function copyCode() {
  if (!currentRoom) return;
  await navigator.clipboard.writeText(currentRoom.room_code);
  showNotice('Room code copied.');
}

// ---------- Game actions ----------
async function saveSecret() {
  if (!currentRoom) return;

  const num = Number(secretInput.value);
  if (!Number.isInteger(num) || num < 1 || num > 100) {
    showNotice('Secret number must be between 1 and 100.', true);
    return;
  }

  if (mySecretChosen()) {
    showNotice('You already locked your secret number.', true);
    return;
  }

  saveSecretBtn.disabled = true;

  try {
    const { data: existingSecret } = await supabase
      .from('secrets')
      .select('id')
      .eq('room_id', currentRoom.id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingSecret) {
      showNotice('You already locked your secret number.', true);
      return;
    }

    const { error } = await supabase.from('secrets').insert({
      room_id: currentRoom.id,
      player_id: playerId,
      secret_number: num
    });

    if (error) {
      showNotice(error.message, true);
      return;
    }

    const { data: roomSecrets } = await supabase
      .from('secrets')
      .select('id')
      .eq('room_id', currentRoom.id);

    if (roomSecrets && roomSecrets.length === 2) {
      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          status: 'playing',
          current_turn_player_id: currentRoom.host_player_id,
          winner_player_id: null
        })
        .eq('id', currentRoom.id);

      if (updateError) {
        showNotice(updateError.message, true);
        return;
      }

      lastTurnKey = '';
      turnSecondsLeft = 10;
    } else {
      await loadRoomData(currentRoom.id);
    }

    secretInput.value = '';
    showNotice('Your number is locked.');
  } finally {
    saveSecretBtn.disabled = false;
  }
}

async function addPointToWinner(roomId, winnerPlayerId) {
  const { data: scoreRow } = await supabase
    .from('scores')
    .select('*')
    .eq('room_id', roomId)
    .eq('player_id', winnerPlayerId)
    .single();

  if (scoreRow) {
    await supabase
      .from('scores')
      .update({ points: scoreRow.points + 1 })
      .eq('id', scoreRow.id);
  }

  const loserId =
    currentRoom.host_player_id === winnerPlayerId
      ? currentRoom.guest_player_id
      : currentRoom.host_player_id;

  const { data: winnerProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('player_id', winnerPlayerId)
    .single();

  if (winnerProfile) {
    await supabase
      .from('user_profiles')
      .update({ wins: winnerProfile.wins + 1 })
      .eq('player_id', winnerPlayerId);
  }

  if (loserId) {
    const { data: loserProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('player_id', loserId)
      .maybeSingle();

    if (loserProfile) {
      await supabase
        .from('user_profiles')
        .update({ losses: loserProfile.losses + 1 })
        .eq('player_id', loserId);
    }
  }

  await loadMyProfile();
}

async function makeGuess() {
  if (!currentRoom) return;

  if (currentRoom.status !== 'playing') {
    showNotice('Game has not started yet.', true);
    return;
  }

  if (!isMyTurn()) {
    showNotice('It is not your turn.', true);
    return;
  }

  const num = Number(guessInput.value);
  if (!Number.isInteger(num) || num < 1 || num > 100) {
    showNotice('Guess must be between 1 and 100.', true);
    return;
  }

  guessBtn.disabled = true;

  try {
    const oppId = getOpponentId();
    if (!oppId) {
      showNotice('Opponent not found.', true);
      return;
    }

    const { data: oppSecret, error: oppSecretError } = await supabase
      .from('secrets')
      .select('secret_number')
      .eq('room_id', currentRoom.id)
      .eq('player_id', oppId)
      .single();

    if (oppSecretError || !oppSecret) {
      showNotice('Opponent secret not ready.', true);
      return;
    }

    let result = 'correct';
    if (num < oppSecret.secret_number) result = 'higher';
    if (num > oppSecret.secret_number) result = 'lower';

    guesses.push({
      id: 'temp-' + Date.now(),
      room_id: currentRoom.id,
      guesser_player_id: playerId,
      target_player_id: oppId,
      guessed_number: num,
      result,
      created_at: new Date().toISOString()
    });
    renderHistory();
    renderHint();

    const { error: guessError } = await supabase.from('guesses').insert({
      room_id: currentRoom.id,
      guesser_player_id: playerId,
      target_player_id: oppId,
      guessed_number: num,
      result
    });

    if (guessError) {
      showNotice(guessError.message, true);
      await loadRoomGuessesOnly(currentRoom.id);
      return;
    }

    stopTurnTimer();

    if (result === 'correct') {
      const { error: finishError } = await supabase
        .from('rooms')
        .update({
          status: 'finished',
          winner_player_id: playerId,
          current_turn_player_id: null
        })
        .eq('id', currentRoom.id);

      if (finishError) {
        showNotice(finishError.message, true);
        return;
      }

      await addPointToWinner(currentRoom.id, playerId);
      showNotice('Correct guess. You won!');
    } else {
      const { error: turnError } = await supabase
        .from('rooms')
        .update({
          current_turn_player_id: oppId
        })
        .eq('id', currentRoom.id);

      if (turnError) {
        showNotice(turnError.message, true);
        return;
      }

      turnSecondsLeft = 10;
      lastTurnKey = '';
      showNotice(result === 'higher' ? 'Higher.' : 'Lower.');
    }

    guessInput.value = '';
  } finally {
    guessBtn.disabled = false;
  }
}

async function sendMessage() {
  if (!currentRoom) return;

  const content = chatInput.value.trim();
  if (!content) return;

  sendChatBtn.disabled = true;

  try {
    const playerName = getMyName();

    messages.push({
      id: 'temp-' + Date.now(),
      room_id: currentRoom.id,
      player_id: playerId,
      player_name: playerName,
      content
    });
    renderMessages();

    const { error } = await supabase.from('messages').insert({
      room_id: currentRoom.id,
      player_id: playerId,
      player_name: playerName,
      content
    });

    if (error) {
      showNotice(error.message, true);
      await loadRoomMessagesOnly(currentRoom.id);
      return;
    }

    chatInput.value = '';
  } finally {
    sendChatBtn.disabled = false;
  }
}

// ---------- Rematch ----------
async function requestRematch() {
  if (!currentRoom || currentRoom.status !== 'finished') return;

  const opponentId = getOpponentId();
  if (!opponentId) return;

  await supabase.from('rematch_requests').upsert({
    room_id: currentRoom.id,
    from_player_id: playerId,
    to_player_id: opponentId,
    status: 'pending'
  });

  await loadRoomData(currentRoom.id);
}

async function acceptRematch(rematchId) {
  await supabase
    .from('rematch_requests')
    .update({ status: 'accepted' })
    .eq('id', rematchId);

  const roomId = currentRoom.id;

  await supabase.from('secrets').delete().eq('room_id', roomId);
  await supabase.from('guesses').delete().eq('room_id', roomId);
  await supabase.from('rematch_requests').delete().eq('room_id', roomId);

  await supabase
    .from('rooms')
    .update({
      status: 'choosing',
      current_turn_player_id: null,
      winner_player_id: null
    })
    .eq('id', roomId);

  lastTurnKey = '';
  turnSecondsLeft = 10;

  await loadRoomData(roomId);
  showNotice('Rematch started.');
}

async function declineRematch(rematchId) {
  await supabase
    .from('rematch_requests')
    .update({ status: 'declined' })
    .eq('id', rematchId);

  await loadRoomData(currentRoom.id);
}

async function playAgain() {
  if (!currentRoom) return;

  const roomId = currentRoom.id;

  const { error: delSecretsError } = await supabase.from('secrets').delete().eq('room_id', roomId);
  if (delSecretsError) {
    showNotice(delSecretsError.message, true);
    return;
  }

  const { error: delGuessesError } = await supabase.from('guesses').delete().eq('room_id', roomId);
  if (delGuessesError) {
    showNotice(delGuessesError.message, true);
    return;
  }

  await supabase.from('rematch_requests').delete().eq('room_id', roomId);

  const { error: updateError } = await supabase
    .from('rooms')
    .update({
      status: 'choosing',
      current_turn_player_id: null,
      winner_player_id: null
    })
    .eq('id', roomId);

  if (updateError) {
    showNotice(updateError.message, true);
    return;
  }

  lastTurnKey = '';
  turnSecondsLeft = 10;

  await loadRoomData(roomId);
  showNotice('New round started. Choose a new secret number.');
}

// ---------- Init ----------
async function initProfileGate() {
  const cookieUsername = getCookie('guess_duel_username');
  const cookieDisplayName = getCookie('guess_duel_display_name');

  if (cookieUsername) profileUsername.value = cookieUsername;
  if (cookieDisplayName) profileDisplayName.value = cookieDisplayName;

  await loadMyProfile();

  if (!myProfile) {
    usernameModal.classList.remove('hidden');
  } else {
    usernameModal.classList.add('hidden');
    await setPresenceOnline(true);
  }

  await Promise.all([loadFriends(), loadFriendRequests(), loadInvites()]);
}

function wireProfileHover() {
  profileButton.addEventListener('mouseenter', () => {
    profileHoverCard.classList.remove('hidden');
  });

  profileButton.addEventListener('mouseleave', () => {
    setTimeout(() => {
      if (!profileHoverCard.matches(':hover')) {
        profileHoverCard.classList.add('hidden');
      }
    }, 100);
  });

  profileHoverCard.addEventListener('mouseleave', () => {
    profileHoverCard.classList.add('hidden');
  });
}

// ---------- Event listeners ----------
saveProfileBtn.addEventListener('click', saveProfile);
addFriendBtn.addEventListener('click', addFriend);

createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
copyCodeBtn.addEventListener('click', copyCode);
leaveRoomBtn.addEventListener('click', leaveRoom);

saveSecretBtn.addEventListener('click', saveSecret);
guessBtn.addEventListener('click', makeGuess);
playAgainBtn.addEventListener('click', playAgain);
requestRematchBtn.addEventListener('click', requestRematch);

sendChatBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

guessInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') makeGuess();
});

secretInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveSecret();
});

joinCode.addEventListener('input', () => {
  joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

// unlock audio on common interactions
['click', 'keydown', 'touchstart'].forEach((evt) => {
  window.addEventListener(evt, unlockAudioFromInteraction, { once: true });
});

window.addEventListener('beforeunload', () => {
  stopTurnTimer();
  if (myProfile) {
    navigator.sendBeacon?.(
      `${SUPABASE_URL}/rest/v1/user_profiles?player_id=eq.${encodeURIComponent(playerId)}`,
      new Blob(
        [JSON.stringify({ is_online: false, last_seen_at: new Date().toISOString() })],
        { type: 'application/json' }
      )
    );
  }
});

// ---------- Boot ----------
setHomeScreen();
wireProfileHover();

Promise.all([
  initProfileGate(),
  subscribeSocialRealtime()
]);
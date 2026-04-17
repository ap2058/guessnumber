import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fmcmnwoopbmitqufaoys.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6jC-frTceZf32cL3ZUAOqA_q5lGRM6K';




const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Home form
const hostName = $('hostName');
const joinName = $('joinName');
const joinCode = $('joinCode');
const createRoomBtn = $('createRoomBtn');
const joinRoomBtn = $('joinRoomBtn');

// Friends + invites
const friendUsernameInput = $('friendUsernameInput');
const addFriendBtn = $('addFriendBtn');
const friendsList = $('friendsList');
const inviteList = $('inviteList');

// Global chat
const globalChatMessages = $('globalChatMessages');
const globalChatInput = $('globalChatInput');
const sendGlobalChatBtn = $('sendGlobalChatBtn');

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
let globalMessages = [];
let scores = [];
let myProfile = null;
let friends = [];
let invites = [];

let roomChannel = null;
let globalChannel = null;
let socialChannel = null;
let roomPoller = null;
let globalPoller = null;
let isLoadingRoom = false;

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
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername && existingUsername.player_id !== playerId) {
      showNotice('Username already taken.', true);
      return;
    }

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingProfile) {
      await supabase
        .from('user_profiles')
        .update({
          username,
          display_name: displayName
        })
        .eq('player_id', playerId);
    } else {
      await supabase.from('user_profiles').insert({
        player_id: playerId,
        username,
        display_name: displayName,
        wins: 0,
        losses: 0
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
  const { data } = await supabase
    .from('friends')
    .select('*')
    .eq('player_id', playerId);

  const rows = data || [];
  const friendProfiles = [];

  for (const row of rows) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('player_id', row.friend_player_id)
      .maybeSingle();

    if (profile) friendProfiles.push(profile);
  }

  friends = friendProfiles;
  renderFriends();
}

function renderFriends() {
  if (!friends.length) {
    friendsList.innerHTML = '<div class="empty">No friends added yet.</div>';
    return;
  }

  friendsList.innerHTML = friends.map((f) => `
    <div class="historyItem">
      <strong>${escapeHtml(f.display_name)}</strong>
      <span style="color:#9fb2d9;"> @${escapeHtml(f.username)}</span>
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

async function addFriend() {
  const username = friendUsernameInput.value.trim().toLowerCase();
  if (!username) return;

  if (!myProfile) {
    showNotice('Save your profile first.', true);
    return;
  }

  addFriendBtn.disabled = true;

  try {
    const { data: friendProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (!friendProfile) {
      showNotice('Friend username not found.', true);
      return;
    }

    if (friendProfile.player_id === playerId) {
      showNotice('You cannot add yourself.', true);
      return;
    }

    const { data: existing } = await supabase
      .from('friends')
      .select('*')
      .eq('player_id', playerId)
      .eq('friend_player_id', friendProfile.player_id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('friends').insert({
        player_id: playerId,
        friend_player_id: friendProfile.player_id
      });
    }

    friendUsernameInput.value = '';
    await loadFriends();
    showNotice('Friend added.');
  } finally {
    addFriendBtn.disabled = false;
  }
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
        <button class="btn secondary acceptInviteBtn" data-id="${inv.id}" data-room="${inv.room_code}">
          Accept
        </button>
        <button class="btn danger declineInviteBtn" data-id="${inv.id}">
          Decline
        </button>
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

// ---------- Global chat ----------
function renderGlobalMessages() {
  if (!globalMessages.length) {
    globalChatMessages.innerHTML = '<div class="empty">No messages yet.</div>';
    return;
  }

  globalChatMessages.innerHTML = globalMessages.map((m) => `
    <div class="chatBubble ${m.player_id === playerId ? 'mine' : ''}">
      <div class="chatName">${escapeHtml(m.player_name)}</div>
      <div>${escapeHtml(m.content)}</div>
    </div>
  `).join('');

  globalChatMessages.scrollTop = globalChatMessages.scrollHeight;
}

async function loadGlobalChat() {
  const { data, error } = await supabase
    .from('global_messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (!error) {
    globalMessages = data || [];
    renderGlobalMessages();
  }
}

async function sendGlobalMessage() {
  const content = globalChatInput.value.trim();
  if (!content) return;

  const playerName = myProfile?.display_name || hostName.value.trim() || joinName.value.trim() || 'Player';

  sendGlobalChatBtn.disabled = true;
  try {
    const { error } = await supabase.from('global_messages').insert({
      player_id: playerId,
      player_name: playerName,
      content
    });

    if (error) {
      showNotice(error.message, true);
      return;
    }

    globalChatInput.value = '';
    await loadGlobalChat();
  } finally {
    sendGlobalChatBtn.disabled = false;
  }
}

// ---------- Game rendering ----------
function resetPanels() {
  secretChooser.classList.add('hidden');
  guessPanel.classList.add('hidden');
  finishedPanel.classList.add('hidden');
  lastHint.classList.add('hidden');
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

function renderGameState() {
  resetPanels();
  renderPlayers();
  renderHistory();
  renderMessages();
  renderHint();

  roomCodeText.textContent = currentRoom.room_code;

  if (currentRoom.status === 'waiting') {
    statusPill.textContent = 'Waiting for Player';
    gameMessage.textContent = 'Waiting for another player to join the room.';
    return;
  }

  if (currentRoom.status === 'choosing') {
    statusPill.textContent = mySecretChosen()
      ? 'Secret Locked • Waiting Opponent'
      : 'Choose Your Secret Number';

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
    return;
  }

  if (currentRoom.status === 'playing') {
    guessPanel.classList.remove('hidden');

    if (isMyTurn()) {
      statusPill.textContent = 'Your Turn to Guess';
      gameMessage.textContent = `Your turn. Guess ${getOpponentName()}'s number.`;
      guessInput.disabled = false;
      guessBtn.disabled = false;
    } else {
      statusPill.textContent = `${getOpponentName()} Is Guessing`;
      gameMessage.textContent = `${getOpponentName()} is taking their turn.`;
      guessInput.disabled = true;
      guessBtn.disabled = true;
    }
    return;
  }

  if (currentRoom.status === 'finished') {
    statusPill.textContent = `${getWinnerName()} Won the Round`;
    gameMessage.textContent = `${getWinnerName()} guessed correctly.`;
    finishedPanel.classList.remove('hidden');
    winnerBanner.textContent = `Winner: ${getWinnerName()}`;
  }
}

function render() {
  if (!currentRoom) {
    setHomeScreen();
    return;
  }
  setGameScreen();
  renderGameState();
}

// ---------- Game data loading ----------
async function loadRoomData(roomId) {
  if (isLoadingRoom) return;
  isLoadingRoom = true;

  try {
    const [roomRes, secretsRes, guessesRes, messagesRes, scoresRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase.from('secrets').select('*').eq('room_id', roomId),
      supabase.from('guesses').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
      supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
      supabase.from('scores').select('*').eq('room_id', roomId)
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

    render();
  } finally {
    isLoadingRoom = false;
  }
}

// ---------- Polling / subscriptions ----------
function startRoomPolling(roomId) {
  stopRoomPolling();
  roomPoller = setInterval(() => {
    if (currentRoom?.id === roomId) loadRoomData(roomId);
  }, 2000);
}

function stopRoomPolling() {
  if (roomPoller) {
    clearInterval(roomPoller);
    roomPoller = null;
  }
}

function startGlobalPolling() {
  stopGlobalPolling();
  globalPoller = setInterval(() => {
    loadGlobalChat();
    loadInvites();
    loadFriends();
  }, 2500);
}

function stopGlobalPolling() {
  if (globalPoller) {
    clearInterval(globalPoller);
    globalPoller = null;
  }
}

async function subscribeToGlobalChat() {
  if (globalChannel) {
    await supabase.removeChannel(globalChannel);
    globalChannel = null;
  }

  globalChannel = supabase
    .channel('global-chat')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'global_messages' }, () => loadGlobalChat())
    .subscribe();

  await loadGlobalChat();
  startGlobalPolling();
}

async function subscribeSocialRealtime() {
  if (socialChannel) {
    await supabase.removeChannel(socialChannel);
    socialChannel = null;
  }

  socialChannel = supabase
    .channel('social-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => loadFriends())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invites' }, () => loadInvites())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, async () => {
      await loadMyProfile();
      await loadFriends();
    })
    .subscribe();
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guesses', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .subscribe();

  await loadRoomData(roomId);
  startRoomPolling(roomId);
}

// ---------- Room lifecycle ----------
async function createRoom() {
  hideNotice();

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
      .select('*')
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
      .select('*')
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
    await loadRoomData(data.id);
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

  currentRoom = null;
  secrets = [];
  guesses = [];
  messages = [];
  scores = [];

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
    await loadRoomData(currentRoom.id);
    return;
  }

  saveSecretBtn.disabled = true;

  try {
    const { data: existingSecret } = await supabase
      .from('secrets')
      .select('*')
      .eq('room_id', currentRoom.id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingSecret) {
      showNotice('You already locked your secret number.', true);
      await loadRoomData(currentRoom.id);
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
      .select('*')
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
    }

    secretInput.value = '';
    await loadRoomData(currentRoom.id);
    showNotice('Your number is locked.');
  } finally {
    if (currentRoom?.status === 'choosing' && !mySecretChosen()) {
      saveSecretBtn.disabled = false;
    }
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
      .select('*')
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

    const { error: guessError } = await supabase.from('guesses').insert({
      room_id: currentRoom.id,
      guesser_player_id: playerId,
      target_player_id: oppId,
      guessed_number: num,
      result
    });

    if (guessError) {
      showNotice(guessError.message, true);
      return;
    }

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

      showNotice(result === 'higher' ? 'Higher.' : 'Lower.');
    }

    guessInput.value = '';
    await loadRoomData(currentRoom.id);
  } finally {
    if (currentRoom?.status === 'playing' && isMyTurn()) {
      guessBtn.disabled = false;
    }
  }
}

async function sendMessage() {
  if (!currentRoom) return;

  const content = chatInput.value.trim();
  if (!content) return;

  sendChatBtn.disabled = true;

  try {
    const { error } = await supabase.from('messages').insert({
      room_id: currentRoom.id,
      player_id: playerId,
      player_name: getMyName(),
      content
    });

    if (error) {
      showNotice(error.message, true);
      return;
    }

    chatInput.value = '';
    await loadRoomData(currentRoom.id);
  } finally {
    sendChatBtn.disabled = false;
  }
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
  }

  await loadFriends();
  await loadInvites();
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

sendChatBtn.addEventListener('click', sendMessage);
sendGlobalChatBtn.addEventListener('click', sendGlobalMessage);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

globalChatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendGlobalMessage();
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

// ---------- Boot ----------
setHomeScreen();
wireProfileHover();
initProfileGate();
subscribeToGlobalChat();
subscribeSocialRealtime();
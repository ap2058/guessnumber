import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fmcmnwoopbmitqufaoys.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6jC-frTceZf32cL3ZUAOqA_q5lGRM6K';


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);

const notice = $('notice');
const homeScreen = $('homeScreen');
const gameScreen = $('gameScreen');

const hostName = $('hostName');
const joinName = $('joinName');
const joinCode = $('joinCode');

const createRoomBtn = $('createRoomBtn');
const joinRoomBtn = $('joinRoomBtn');
const copyCodeBtn = $('copyCodeBtn');
const leaveRoomBtn = $('leaveRoomBtn');

const roomCodeText = $('roomCodeText');
const statusPill = $('statusPill');
const gameMessage = $('gameMessage');

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

const historyList = $('historyList');
const chatMessages = $('chatMessages');
const chatInput = $('chatInput');
const sendChatBtn = $('sendChatBtn');

const globalChatMessages = $('globalChatMessages');
const globalChatInput = $('globalChatInput');
const sendGlobalChatBtn = $('sendGlobalChatBtn');

let playerId = getOrCreatePlayerId();
let currentRoom = null;
let secrets = [];
let guesses = [];
let messages = [];
let globalMessages = [];
let scores = [];
let channel = null;
let globalChannel = null;
let poller = null;
let globalPoller = null;
let isLoadingRoom = false;

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
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
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
  if (!currentRoom) {
    const homeName = hostName.value.trim() || joinName.value.trim();
    return homeName || 'Player';
  }
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

function startPolling(roomId) {
  stopPolling();
  poller = setInterval(() => {
    if (currentRoom?.id === roomId) {
      loadRoomData(roomId);
    }
  }, 2000);
}

function stopPolling() {
  if (poller) {
    clearInterval(poller);
    poller = null;
  }
}

function startGlobalPolling() {
  stopGlobalPolling();
  globalPoller = setInterval(() => {
    loadGlobalChat();
  }, 2000);
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

  startGlobalPolling();
  await loadGlobalChat();
}

async function subscribeToRoom(roomId) {
  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }

  channel = supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'secrets', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guesses', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .subscribe();

  startPolling(roomId);
  await loadRoomData(roomId);
}

async function createRoom() {
  hideNotice();

  const name = hostName.value.trim();
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

    await supabase.from('scores').insert({
      room_id: data.id,
      player_id: playerId,
      points: 0
    });

    await subscribeToRoom(data.id);
    showNotice('Room created. Share the code with your friend.');
  } finally {
    createRoomBtn.disabled = false;
  }
}

async function joinRoom() {
  hideNotice();

  const name = joinName.value.trim();
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
    const { data: existingSecret, error: existingError } = await supabase
      .from('secrets')
      .select('*')
      .eq('room_id', currentRoom.id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingError) {
      showNotice(existingError.message, true);
      return;
    }

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

    const { data: roomSecrets, error: secretsError } = await supabase
      .from('secrets')
      .select('*')
      .eq('room_id', currentRoom.id);

    if (secretsError) {
      showNotice(secretsError.message, true);
      return;
    }

    if (roomSecrets.length === 2) {
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
  const { data: scoreRow, error } = await supabase
    .from('scores')
    .select('*')
    .eq('room_id', roomId)
    .eq('player_id', winnerPlayerId)
    .single();

  if (error || !scoreRow) return;

  await supabase
    .from('scores')
    .update({ points: scoreRow.points + 1 })
    .eq('id', scoreRow.id);
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

async function sendGlobalMessage() {
  const content = globalChatInput.value.trim();
  if (!content) return;

  const playerName = hostName.value.trim() || joinName.value.trim() || getMyName();

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

async function leaveRoom() {
  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }

  stopPolling();

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

createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
saveSecretBtn.addEventListener('click', saveSecret);
guessBtn.addEventListener('click', makeGuess);
sendChatBtn.addEventListener('click', sendMessage);
sendGlobalChatBtn.addEventListener('click', sendGlobalMessage);
playAgainBtn.addEventListener('click', playAgain);
leaveRoomBtn.addEventListener('click', leaveRoom);
copyCodeBtn.addEventListener('click', copyCode);

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

setHomeScreen();
subscribeToGlobalChat();
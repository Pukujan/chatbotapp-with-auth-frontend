import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;



// chatSlice.js
export const fetchChats = createAsyncThunk('chat/fetchChats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      if (!auth.token) throw new Error('No token');

      const response = await axios.get(`${API_BASE_URL}/chats`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      return response.data.chats;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createChat = createAsyncThunk(
  'chat/createChat',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      if (!auth.token) {
        return rejectWithValue('No authentication token');
      }

      const response = await axios.post(`${API_BASE_URL}/chat`, null, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (chatId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      if (!auth.token) throw new Error('No token');

      const response = await axios.get(`${API_BASE_URL}/chat/${chatId}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      return { chatId, messages: response.data.messages };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ chatId, sender, message }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      if (!auth.token) throw new Error('No token');

      const response = await axios.post(
        `${API_BASE_URL}/chat/${chatId}/message`,
        { sender, message },
        {
          headers: { Authorization: `Bearer ${auth.token}` }
        }
      );
      return { chatId, message: response.data.message };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteChat = createAsyncThunk(
  'chat/deleteChat',
  async (chatId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      if (!auth.token) throw new Error('No token');

      await axios.delete(`${API_BASE_URL}/chat/${chatId}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      return chatId;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateChatName = createAsyncThunk(
  'chat/updateChatName',
  async ({ chatId, chatName }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      if (!auth.token) throw new Error('No token');

      const response = await axios.put(
        `${API_BASE_URL}/chat/${chatId}/name`,
        { chatName },
        {
          headers: { Authorization: `Bearer ${auth.token}` }
        }
      );
      return { chatId, chatName };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  chats: [],
  currentChatId: null,
  messages: [],
  status: 'idle',
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChat: (state, action) => {
      state.currentChatId = action.payload;
    },
    updateChatName: (state, action) => {
      const { chatId, chatName } = action.payload;
      const chat = state.chats.find(c => c.chatId === chatId);
      if (chat) chat.chatName = chatName;
    },
    addMessageOptimistically: (state, action) => {
      if (state.currentChatId === action.payload.chatId) {
        state.messages.push(action.payload.message);
      }
    },
    resetChatState: () => initialState
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.chats = action.payload;
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createChat.fulfilled, (state, action) => {
        state.chats.push({
          chatId: action.payload.chatId,
          chatName: action.payload.chatName
        });
        state.currentChatId = action.payload.chatId;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        if (state.currentChatId === action.payload.chatId) {
          state.messages = action.payload.messages;
        }
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        if (state.currentChatId === action.payload.chatId) {
          state.messages.push({
            sender: 'AI',
            message: action.payload.message,
            timestamp: new Date().toISOString(),
          });
        }
      })
      .addCase(updateChatName.fulfilled, (state, action) => {
        const { chatId, chatName } = action.payload;
        const chat = state.chats.find(c => c.chatId === chatId);
        if (chat) {
          chat.chatName = chatName;
        }
      })
      .addCase(deleteChat.fulfilled, (state, action) => {
        state.chats = state.chats.filter(chat => chat.chatId !== action.payload);
        if (state.currentChatId === action.payload) {
          state.currentChatId = state.chats.length > 0 ? state.chats[0].chatId : null;
          state.messages = [];
        }
      });
  },
});

export const {
  setCurrentChat,
  addMessageOptimistically,
  resetChatState
} = chatSlice.actions;

export default chatSlice.reducer;
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from "redux";
import { persistStore, persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage";
import authReducer from "../app/authSlice"

// Redux에는 클라이언트 상태(인증)만 둔다.
// 보호자·환자 정보는 서버 데이터라 TanStack Query(useUserInfo)로 관리
const rootReducer = combineReducers({
  auth: authReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const resetStore = () => {
  persistor.purge(); 
};
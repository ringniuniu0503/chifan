import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

// --- Configuration ---
// Paste your logo URL here to replace the illustration
const CUSTOM_LOGO_URL = "https://drive.google.com/file/d/1chN9y2i6wwVfAgwhK8PfYw2s0gO9Rtwa/view?usp=sharing"; 

// --- Types ---
interface Coordinates {
  lat: number;
  lng: number;
}

interface Place {
  id: string;
  title: string;
  uri: string;
  rating?: string;
  userRatingCount?: number;
  address?: string; 
  description: string;
  tags: string[];
  source: 'maps' | 'web' | 'custom' | 'database';
  location?: Coordinates;
}

type MealTime = 'breakfast' | 'lunch' | 'dinner';
type ViewState = 'home' | 'guide' | 'settings' | 'draw' | 'favorites';

// --- Data: Scenario Mapping ---
const SCENARIOS = [
    { label: "下雨天", sub: "Rainy", icon: "🌧️", prompt: "hot soup, hotpot, spicy comfort food, ramen, noodle soup" },
    { label: "吃素", sub: "Vegetarian", icon: "🥦", prompt: "vegetarian restaurant, vegan friendly, buddhist vegetarian, plant-based dining, meat-free" },
    { label: "月底救星", sub: "Cheap", icon: "💸", prompt: "cheap eats under 100 TWD, braised pork rice, dumplings, street food" },
    { label: "犒賞自己", sub: "Treat", icon: "✨", prompt: "high rated restaurant, steak, izakaya, bistro, nice ambiance" },
    { label: "趕時間", sub: "Rush", icon: "🏃", prompt: "fast food, bento box, convenience store food, quick takeout" },
    { label: "想喝湯", sub: "Soup", icon: "🥣", prompt: "chicken soup, beef soup, fish soup, herbal soup" },
    { label: "朋友聚餐", sub: "Group", icon: "🍻", prompt: "hotpot, stir fry (re chao), bbq, large table restaurant" },
    { label: "不想吃澱粉", sub: "Low Carb", icon: "🥗", prompt: "salad, protein box, salt water chicken, steak" },
    { label: "螞蟻人", sub: "Sweet Tooth", icon: "🍧", prompt: "shaved ice, douhua, waffle, dessert shop, bubble tea" }
];

const FOOD_DATABASE = {
  breakfast: [
    "蛋餅", "蘿蔔糕", "鐵板麵", "小籠包", "飯糰", "燒餅油條", "鹹豆漿", "牛肉湯", "厚片吐司", 
    "蔥抓餅", "水煎包", "皮蛋瘦肉粥", "地瓜粥", "米漿", "豆漿", "三明治", "饅頭夾蛋",
    "美式黑咖啡", "厚片吐司（花生）", "豬排蛋吐司", "總匯三明治", "蘿蔔糕加蛋", "蔥抓餅加蛋",
    "蒸餃", "廣東粥", "紫米飯糰", "鮮奶茶", "冰豆漿", "德式香腸", "起司蛋餅", "薯餅"
  ],
  lunch: [
    "排骨便當", "雞腿飯", "牛肉麵", "水餃", "鍋貼", "酸辣湯", "滷肉飯", "義大利麵", "健康餐盒", 
    "涼麵", "榨菜肉絲麵", "餛飩麵", "麻醬麵", "炒飯", "燴飯", "咖哩飯", "控肉飯", "火雞肉飯",
    "三杯雞便當", "香腸便當", "魚排便當", "無骨雞腿排", "雙拼便當", "紅燒牛腩", "擔仔麵",
    "排骨酥麵", "魚丸湯麵", "鴨肉麵", "鮭魚炒飯", "韓式拌飯", "牛丼", "蒜泥白肉", "宮保雞丁"
  ],
  dinner: [
    "火鍋", "熱炒", "鹽酥雞", "滷味", "牛排", "拉麵", "壽司", "串燒", "藥燉排骨", "臭豆腐", 
    "大腸包小腸", "蚵仔煎", "肉圓", "羊肉爐", "薑母鴨", "砂鍋魚頭", "居酒屋", "韓式烤肉", "鐵板燒",
    "蔥爆牛肉", "蒼蠅頭", "塔香蛤蜊", "客家小炒", "麻婆豆腐", "麻辣鍋", "海鮮粥", "刈包",
    "豬血糕", "烤魷魚", "清蒸魚", "虱目魚肚", "砂鍋粥", "日式丼飯", "親子丼", "炸醬麵"
  ]
};

// --- Helpers ---
const getFoodEmoji = (title: string): string => {
  if (title.includes("麵") || title.includes("拉麵")) return "🍜";
  if (title.includes("飯") || title.includes("丼") || title.includes("便當") || title.includes("粥")) return "🍱";
  if (title.includes("鍋") || title.includes("爐") || title.includes("湯")) return "🍲";
  if (title.includes("餃") || title.includes("湯包") || title.includes("包") || title.includes("饅頭")) return "🥟";
  if (title.includes("牛排") || title.includes("肉") || title.includes("排")) return "🥩";
  if (title.includes("壽司") || title.includes("日式") || title.includes("生魚片")) return "🍣";
  if (title.includes("炸") || title.includes("雞") || title.includes("薯")) return "🍗";
  if (title.includes("茶") || title.includes("咖啡") || title.includes("飲") || title.includes("漿")) return "🧋";
  if (title.includes("冰") || title.includes("豆花") || title.includes("甜")) return "🍧";
  if (title.includes("素") || title.includes("蔬") || title.includes("沙拉")) return "🥦";
  if (title.includes("蛋") || title.includes("餅")) return "🍳";
  if (title.includes("堡") || title.includes("三明治")) return "🍔";
  if (title.includes("披薩")) return "🍕";
  if (title.includes("義大利麵")) return "🍝";
  return "🥢"; 
};

// --- Icons ---
const Icons = {
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  MapPin: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  // Wand Sparkles
  WandSparkles: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/>
      <path d="m14 7 3 3"/>
      <path d="M5 6v4"/>
      <path d="M19 14v4"/>
      <path d="M10 2v2"/>
      <path d="M7 8H3"/>
      <path d="M21 16h-4"/>
      <path d="M11 3H9"/>
    </svg>
  ),
  Refresh: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
  Shuffle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>,
  // Box for Smart Guide
  Box: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  ),
  Navigation: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Stop: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12"></rect></svg>,
  Home: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Settings: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  ArrowLeft: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  Heart: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  HeartFilled: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
};

// --- Styles (ChiFan Palette) ---
const styles = {
  appContainer: {
    display: "flex",
    flexDirection: "column" as "column",
    height: "100%",
    backgroundColor: "#F4F0E6", // Rice Paper
    color: "#2C2C2C",
    backgroundImage: "radial-gradient(#D6D0C2 1px, transparent 1px)",
    backgroundSize: "20px 20px",
  },
  header: {
    padding: "24px 24px 20px 24px",
    background: "#F4F0E6",
    position: "sticky" as "sticky",
    top: 0,
    zIndex: 50,
  },
  topNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    marginTop: "8px",
    fontSize: "20px",
    color: "#005856",
    fontFamily: "'Merriweather', serif",
    fontWeight: 900,
  },
  locationBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    padding: "6px 12px",
    background: "#E8E4D9",
    borderRadius: "20px",
    border: "1px solid #D6D0C2",
    color: "#2F5C5C",
    fontWeight: 600,
    fontSize: "14px"
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    background: "#FFF",
    borderRadius: "8px",
    padding: "10px 16px",
    marginBottom: "8px",
    border: "2px solid #005856",
    boxShadow: "2px 2px 0px rgba(0,88,86,0.2)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    marginLeft: "12px",
    fontSize: "16px",
    fontFamily: "'Noto Sans TC', sans-serif",
    background: "transparent",
    color: "#2C2C2C", // Ensure visible
    fontWeight: 500,
  },
  scrollContent: {
    flex: 1,
    overflowY: "auto" as "auto",
    padding: "0 16px 100px 16px", // 16px Global side padding
  },
  heroFrame: {
    marginTop: "24px",
    marginBottom: "24px",
    background: "#E7B953", // Yellow card body
    border: "2px solid #005856",
    borderRadius: "12px",
    position: "relative" as "relative",
    padding: "6px", 
    zIndex: 1,
    boxShadow: 'none', // Removed shadow
  },
  heroInner: {
    border: "2px dashed #C23921", // Red dashed
    backgroundColor: "#FFFEF8",
    padding: "20px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column" as "column",
    gap: "12px",
    position: "relative" as "relative",
    zIndex: 2,
  },
  heroLabel: {
    position: "absolute" as "absolute",
    top: "-14px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#C23921", // Red
    color: "#FFF",
    padding: "4px 12px",
    fontSize: "13px",
    fontWeight: 800,
    borderRadius: "4px",
    boxShadow: "1px 1px 2px rgba(0,0,0,0.2)",
    zIndex: 10,
    whiteSpace: 'nowrap' as 'nowrap'
  },
  btnPrimary: {
    background: "#C23921", // Red
    color: "#FFF",
    border: "none",
    padding: "12px 16px", // 12px vertical padding
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "2px 2px 0px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "'Noto Sans TC', sans-serif",
  },
  btnSecondary: {
    background: "#FFF",
    color: "#005856",
    border: "2px solid #005856",
    padding: "12px 16px", // 12px vertical padding
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "2px 2px 0px rgba(47,92,92,0.2)",
  },
  // Guide View Styles
  guidePage: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as 'column',
    padding: '16px',
    paddingBottom: '100px',
    overflowY: 'auto' as 'auto',
    backgroundColor: '#F4F0E6'
  },
  guideHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '3px double #005856',
    paddingBottom: '16px'
  },
  guideTitle: {
    fontSize: '24px',
    fontWeight: 900,
    color: '#005856',
    marginLeft: '12px',
    fontFamily: "'Merriweather', serif"
  },
  choiceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginTop: '20px'
  },
  choiceCard: {
    background: '#FFF',
    border: '2px solid #005856',
    borderRadius: '12px',
    padding: '24px 12px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.1s',
    minHeight: '140px',
    textAlign: 'center' as 'center',
    // No shadow default
  },
  choiceIcon: {
    fontSize: '40px',
    marginBottom: '12px'
  },
  choiceLabelCn: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#005856'
  },
  choiceLabelEn: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px'
  },
  guideQuestion: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#C23921',
    marginBottom: '16px',
    textAlign: 'center' as 'center',
    fontFamily: "'Noto Sans TC', sans-serif"
  },
  // Result View
  resultPage: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    paddingBottom: '100px',
  },
  bigResultCard: {
    width: '100%',
    maxWidth: '320px',
    background: '#E7B953',
    border: '3px solid #005856',
    borderRadius: '16px',
    padding: '4px', // Inner padding for border effect
    boxShadow: '8px 8px 0px #C18C5D',
    marginBottom: '24px'
  },
  bigResultInner: {
    background: '#FFFCF5',
    border: '2px dashed #C23921',
    borderRadius: '10px',
    padding: '30px 20px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    textAlign: 'center' as 'center'
  },
  bigResultEmoji: {
    fontSize: '80px',
    marginBottom: '20px',
    filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.1))'
  },
  bigResultTitle: {
    fontSize: '28px',
    fontWeight: 900,
    color: '#005856',
    marginBottom: '10px',
    lineHeight: 1.2,
    fontFamily: "'Noto Sans TC', sans-serif"
  },
  bigResultDesc: {
    fontSize: '15px',
    color: '#666',
    marginBottom: '24px',
    lineHeight: 1.5
  },
  
  // Home Page Elements
  guideButton: {
    background: "#005856", // Dark Green
    color: "#FFF", // White text
    width: "100%",
    padding: "20px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    fontWeight: 700,
    fontSize: "18px",
    marginBottom: "24px",
    marginTop: "16px",
    cursor: "pointer",
    border: "none", // No border needed with solid background
    position: 'relative' as 'relative',
    overflow: 'hidden'
  },
  categoryRow: {
    display: "flex",
    flexWrap: "wrap" as "wrap",
    gap: "10px",
    marginBottom: "32px",
  },
  categoryTile: {
    background: "#FFF",
    border: "1px solid #005856",
    color: "#005856",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.1s",
    // No default shadow
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#005856",
    fontFamily: "'Merriweather', serif",
    marginBottom: "16px",
    borderBottom: "1px solid #D6D0C2",
    paddingBottom: "8px",
  },
  horizontalScroll: {
    display: "flex",
    gap: "16px",
    overflowX: "auto" as "auto",
    paddingBottom: "12px",
    marginRight: "-16px", // Compensation for padding
    paddingRight: "16px",
  },
  ticketCard: {
    minWidth: "240px",
    maxWidth: "240px",
    background: "#FFFCF5",
    border: "2px solid #005856",
    borderRadius: "8px",
    overflow: "hidden",
    cursor: "pointer",
    position: "relative" as "relative",
    display: 'flex',
    flexDirection: 'column' as 'column'
  },
  ticketImg: {
    height: "110px",
    background: "#E8E4D9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "50px",
    borderBottom: "1px dashed #005856",
    position: 'relative' as 'relative'
  },
  favIconBtn: {
    position: 'absolute' as 'absolute',
    top: '8px', right: '8px',
    width: '40px', height: '40px', // Updated to 40px
    borderRadius: '50%',
    background: '#FFF',
    border: '2px solid #006F67', // Stroke 2px
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    color: '#005856', // Default dark green
    zIndex: 10
  },
  favIconBtnActive: {
    color: '#C23921' // Red when active
  },
  ticketBody: {
    padding: "12px",
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as 'column'
  },
  ticketTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#2C2C2C",
    marginBottom: "4px",
    whiteSpace: "nowrap" as "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  ticketMeta: {
    fontSize: "13px",
    color: "#C23921",
    fontWeight: 500,
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '6px'
  },
  mapLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#005856',
    fontSize: '12px',
    textDecoration: 'none',
    border: '1px solid #005856',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 600
  },
  // Bottom Nav
  bottomNav: {
    position: "fixed" as "fixed",
    bottom: 0, left: 0, right: 0,
    background: "#005856",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    height: "70px",
    zIndex: 150,
    borderTop: "4px solid #D4A373",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
  },
  navItem: {
    display: "flex",
    flexDirection: "column" as "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#B0C4C4", // Light gray inactive
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    gap: "4px",
    flex: 1,
    height: "100%",
  },
  navItemActive: {
    color: "#E7B953", // Yellow active
  },
  navIcon: {
    marginBottom: "2px",
  },
  navCenterBtn: {
    background: "#C23921", // Red
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    border: "3px solid #E7B953", // Yellow
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFF",
    transform: "translateY(-20px)",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  },
  // Modals
  modalOverlay: {
    position: "fixed" as "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0, 0, 0, 0.7)", // 70% black
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backdropFilter: "blur(4px)",
  },
  modalContent: {
    background: "#FFFCF5",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "340px",
    padding: "0",
    textAlign: "center" as "center",
    boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
    overflow: "hidden",
    position: "relative" as "relative",
    border: "4px solid #C23921",
  },
  modalHeader: {
    background: "#C23921",
    color: "#FFF",
    padding: "16px",
    fontSize: "20px",
    fontWeight: 700,
    fontFamily: "'Merriweather', serif",
    letterSpacing: "1px",
    borderBottom: "4px solid #E7B953"
  },
  modalBody: {
    padding: "32px 24px",
    minHeight: "300px",
    display: "flex",
    flexDirection: "column" as "column",
    alignItems: "center",
    justifyContent: "center",
  },
  // Result
  resultCard: {
    background: "#FFF",
    border: "2px solid #005856",
    padding: "16px",
    width: "100%",
    marginTop: "16px",
    position: "relative" as "relative",
    boxShadow: "4px 4px 0px #E7B953",
  },
  heroTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#005856",
    fontFamily: "'Merriweather', serif",
  },
  heroSuggestion: {
    fontSize: "36px",
    fontWeight: 900,
    color: "#C23921",
    lineHeight: "1.2",
    display: "block",
  },
  heroActions: {
    display: "flex",
    gap: "10px",
    marginTop: "8px",
  },
  blockContainer: {
    display: "flex",
    gap: "24px",
    justifyContent: "center",
    marginBottom: "24px",
    height: "120px", 
    alignItems: "center",
    width: "100%",
    position: "relative" as "relative"
  },
  // Group Draw Input
  tabContainer: {
    display: 'flex',
    width: '100%',
    marginBottom: '20px',
    borderBottom: '2px solid #005856'
  },
  tab: {
    flex: 1,
    padding: '10px',
    cursor: 'pointer',
    fontWeight: 600,
    color: '#005856',
    opacity: 0.6,
    borderBottom: '4px solid transparent',
    transition: 'all 0.2s'
  },
  activeTab: {
    opacity: 1,
    borderBottom: '4px solid #C23921',
    background: '#FFF8E7'
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
    width: '100%',
    marginBottom: '16px'
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '4px',
    border: '2px solid #005856',
    fontSize: '16px',
    fontFamily: "'Noto Sans TC', sans-serif",
    color: '#2C2C2C', // Readable text
    background: '#FFF' // Readable bg
  },
  addButton: {
    color: '#FFF',
    border: 'none',
    borderRadius: '4px',
    width: '40px',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap' as 'wrap',
    gap: '8px',
    maxHeight: '120px',
    overflowY: 'auto' as 'auto',
    width: '100%',
    justifyContent: 'center'
  },
  tag: {
    background: '#FFF',
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  // Slideshow
  slideshowContainer: {
    width: '100%',
    height: '220px',
    background: '#FFF',
    border: '4px double #005856',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
    position: 'relative' as 'relative',
    cursor: 'pointer' 
  },
  slideEmoji: {
    fontSize: '80px',
    marginBottom: '10px',
    filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.1))'
  },
  slideText: {
    fontSize: '24px',
    fontWeight: 900,
    color: '#005856',
    fontFamily: "'Noto Sans TC', sans-serif",
    textAlign: 'center' as 'center',
    padding: '0 10px'
  },
  stopButtonBelow: {
    background: '#C23921',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '24px',
    fontWeight: 700,
    fontSize: '14px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
    animation: 'pulse 1s infinite',
    display: 'flex', alignItems: 'center', gap: '6px',
    margin: '0 auto'
  }
};

// --- Components ---

// Custom Illustration for "Thinking"
const ThinkingGod = () => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="#E7B953" opacity="0.2" />
        <path d="M40 50 C40 30, 80 30, 80 50 C 90 50, 95 70, 80 80 L 40 80 C 25 70, 30 50, 40 50" fill="#FFF" stroke="#005856" strokeWidth="3" />
        <path d="M50 65 Q 60 75 70 65" stroke="#005856" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="55" r="3" fill="#005856" />
        <circle cx="70" cy="55" r="3" fill="#005856" />
    </svg>
);

function FoodSlide({ item }: { item: Place | string }) {
  const title = typeof item === 'string' ? item : item.title;
  const emoji = getFoodEmoji(title);
  
  return (
    <div style={styles.slideshowContainer} className="slide-anim">
      <div style={styles.slideEmoji}>{emoji}</div>
      <div style={styles.slideText}>{title}</div>
    </div>
  )
}

function SmartGuideView({ onClose, onComplete, loc, promptGenAI, isVegetarian }: any) {
  const [step, setStep] = useState(isVegetarian ? 1 : 0);
  const [prefs, setPrefs] = useState({ diet: isVegetarian ? 'vegetarian' : '', mood: '', budget: '', time: '' });
  const [isThinking, setIsThinking] = useState(false);
  const [recommendation, setRecommendation] = useState<Place | null>(null);

  const handleNext = (key: string, value: string) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    if (step < 3) {
        setStep(step + 1);
    } else {
        finish(newPrefs);
    }
  };

  const finish = async (finalPrefs: any) => {
    setIsThinking(true);
    let prompt = `I need a single definitive recommendation for ${finalPrefs.time} in Taiwan. `;
    prompt += `My mood is ${finalPrefs.mood}. Budget is ${finalPrefs.budget}. `;
    if (finalPrefs.diet === 'vegetarian') {
        prompt += ` STRICTLY VEGETARIAN/VEGAN only. Do not suggest places that only sell meat.`;
    }
    prompt += `Find one real nearby place using Google Maps.`;
    
    const results = await promptGenAI(prompt, true);
    setIsThinking(false);
    
    if (results && results.length > 0) {
        setRecommendation(results[0]);
    } else {
        setRecommendation({
            id: 'fallback',
            title: 'Chef\'s Surprise',
            uri: 'https://www.google.com/maps/search/?api=1&query=restaurants+nearby',
            description: 'The spirits are unclear. Try exploring nearby!',
            tags: [],
            source: 'web'
        });
    }
  };

  if (isThinking) {
      return (
          <div style={styles.guidePage}>
               <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                   {CUSTOM_LOGO_URL ? (
                       <img src={CUSTOM_LOGO_URL} alt="Loading" style={{width:'120px', height:'120px', marginBottom:'20px', objectFit:'contain'}} className="shake-anim" />
                   ) : (
                       <div className="shake-anim" style={{marginBottom: '20px'}}><ThinkingGod /></div>
                   )}
                   <h2 style={{color: '#005856', marginBottom: '8px', marginTop: 0}}>神機妙算中...</h2>
                   <p style={{color: '#666', margin: 0}}>Let me think about it...</p>
               </div>
          </div>
      )
  }

  if (recommendation) {
      return (
          <div style={styles.resultPage}>
              <div style={styles.bigResultCard}>
                  <div style={styles.bigResultInner}>
                      <div style={styles.bigResultEmoji}>{getFoodEmoji(recommendation.title)}</div>
                      <div style={styles.bigResultTitle}>{recommendation.title}</div>
                      <div style={styles.bigResultDesc}>{recommendation.description}</div>
                      
                      <a href={recommendation.uri} target="_blank" style={{textDecoration: 'none', width: '100%'}}>
                          <button style={{...styles.btnPrimary, width: '100%', justifyContent: 'center', padding: '16px', fontSize: '18px'}}>
                              <Icons.Navigation /> Navigate
                          </button>
                      </a>
                  </div>
              </div>
              <button onClick={() => { setRecommendation(null); setStep(isVegetarian?1:0); }} style={styles.btnSecondary}>
                  <Icons.Refresh /> Ask Again
              </button>
              <button onClick={onClose} style={{marginTop: '20px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', textDecoration: 'underline'}}>
                  Back Home
              </button>
          </div>
      )
  }

  return (
    <div style={styles.guidePage}>
       <div style={styles.guideHeader}>
          <div onClick={onClose} style={{cursor:'pointer'}}><Icons.ArrowLeft /></div>
          <div style={styles.guideTitle}>神機妙算 Smart Guide</div>
       </div>

       {step === 0 && (
          <>
              <div style={styles.guideQuestion}>飲食限制 Dietary Preferences?</div>
              <div style={styles.choiceGrid}>
                  <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('diet', 'none')}>
                      <div style={styles.choiceIcon}>🍖</div>
                      <div style={styles.choiceLabelCn}>我吃肉</div>
                      <div style={styles.choiceLabelEn}>Meat</div>
                  </div>
                  <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('diet', 'vegetarian')}>
                      <div style={styles.choiceIcon}>🥦</div>
                      <div style={styles.choiceLabelCn}>我吃素</div>
                      <div style={styles.choiceLabelEn}>Vegetarian</div>
                  </div>
              </div>
          </>
       )}

       {step === 1 && (
          <>
              <div style={styles.guideQuestion}>心情如何 Current Mood?</div>
              <div style={styles.choiceGrid}>
                  <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('mood', 'comfort')}>
                       <div style={styles.choiceIcon}>🍜</div>
                       <div style={styles.choiceLabelCn}>療癒</div>
                       <div style={styles.choiceLabelEn}>Comfort</div>
                  </div>
                  <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('mood', 'adventure')}>
                       <div style={styles.choiceIcon}>🌶️</div>
                       <div style={styles.choiceLabelCn}>嚐鮮</div>
                       <div style={styles.choiceLabelEn}>Adventure</div>
                  </div>
                  <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('mood', 'healthy')}>
                       <div style={styles.choiceIcon}>🥗</div>
                       <div style={styles.choiceLabelCn}>健康</div>
                       <div style={styles.choiceLabelEn}>Healthy</div>
                  </div>
                  {prefs.diet === 'vegetarian' ? (
                      <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('mood', 'rich')}>
                           <div style={styles.choiceIcon}>🍛</div>
                           <div style={styles.choiceLabelCn}>重口味</div>
                           <div style={styles.choiceLabelEn}>Rich</div>
                      </div>
                  ) : (
                      <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('mood', 'meat')}>
                           <div style={styles.choiceIcon}>🥩</div>
                           <div style={styles.choiceLabelCn}>大口吃肉</div>
                           <div style={styles.choiceLabelEn}>Meat</div>
                      </div>
                  )}
                  <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('mood', 'small')}>
                       <div style={styles.choiceIcon}>🥟</div>
                       <div style={styles.choiceLabelCn}>小鳥胃</div>
                       <div style={styles.choiceLabelEn}>Small Portion</div>
                  </div>
              </div>
          </>
       )}
       
       {step === 2 && (
          <>
              <div style={styles.guideQuestion}>預算 Budget?</div>
              <div style={styles.choiceGrid}>
                  <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('budget', 'cheap')}>
                       <div style={styles.choiceIcon}>🪙</div>
                       <div style={styles.choiceLabelCn}>銅板價</div>
                       <div style={styles.choiceLabelEn}>Cheap</div>
                  </div>
                  <div className="choice-card-interactive" style={styles.choiceCard} onClick={() => handleNext('budget', 'normal')}>
                       <div style={styles.choiceIcon}>💵</div>
                       <div style={styles.choiceLabelCn}>一般</div>
                       <div style={styles.choiceLabelEn}>Normal</div>
                  </div>
                  <div className="choice-card-interactive" style={{...styles.choiceCard, gridColumn: '1 / -1'}} onClick={() => handleNext('budget', 'fancy')}>
                       <div style={styles.choiceIcon}>🥂</div>
                       <div style={styles.choiceLabelCn}>吃好點</div>
                       <div style={styles.choiceLabelEn}>Fancy</div>
                  </div>
              </div>
          </>
       )}
       
       {step === 3 && (
          <>
              <div style={styles.guideQuestion}>時間 Time?</div>
                <div style={styles.choiceGrid}>
                    <div
                        className="choice-card-interactive"
                        style={styles.choiceCard}
                        onClick={() => handleNext('time', 'rush')}
                    >
                        <div style={styles.choiceIcon}>🥡</div>
                        <div>快速餐點</div>
                    </div>
                </div>

                       

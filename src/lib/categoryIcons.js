/**
 * categoryIcons.js — Shared category emoji and color mapping
 * Used by WorkerSkillsHero, TaskDetail, and other components
 */

export const CATEGORY_ICONS = {
  plumbing:         { emoji: '🔧', color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
  electricity:      { emoji: '⚡', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  handyman:         { emoji: '🔨', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  cleaning:         { emoji: '🧹', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  moving:           { emoji: '🚛', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  heavy_lifting:    { emoji: '💪', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  painting:         { emoji: '🎨', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  carpentry:        { emoji: '🪵', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  ac:               { emoji: '❄️', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  locksmith:        { emoji: '🔐', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  gardening:        { emoji: '🌿', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  home_maintenance: { emoji: '🏠', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  transportation:   { emoji: '🚗', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  delivery:         { emoji: '📦', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  shopping:         { emoji: '🛒', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  pets:             { emoji: '🐶', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  babysitting:      { emoji: '👶', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  elderly_care:     { emoji: '👵', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  tutoring:         { emoji: '📚', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  fitness:          { emoji: '🏋️', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  photography:      { emoji: '📸', color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' },
  events:           { emoji: '🎉', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
  personal_help:    { emoji: '🤝', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  it_support:       { emoji: '💻', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  other:            { emoji: '📋', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
};

export const getCategoryIcon = (category) => CATEGORY_ICONS[category] || CATEGORY_ICONS.other;
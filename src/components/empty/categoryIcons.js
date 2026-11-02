import {
  Baby, BookOpen, ClipboardList, Droplets, Dumbbell, Hammer, Handshake,
  HeartHandshake, Home, KeyRound, Laptop, Package, Paintbrush, PartyPopper,
  PawPrint, Puzzle, Snowflake, Sparkles, Sprout, Tag, Truck, Wrench, Zap,
} from 'lucide-react';
import { rootOf } from '@/lib/brand/categoryTree';

/**
 * ONE icon system for categories, used wherever a category is shown as an icon
 * tile (today: the published-tasks empty state).
 *
 * The catalogue carries an EMOJI per category, and emoji are drawn by the
 * device: different style, different size, different colour on every phone. That
 * is what made a row of them look improvised. This maps each category to a
 * line icon from the same set the rest of the app draws — one stroke width, one
 * colour, one size — so a rail of categories reads as one designed system.
 *
 * The mapping keys are the ROOT keys of the global catalogue. A deeper
 * (service) key resolves through its root, so a Brand showing its own services
 * gets the icon of the trade they belong to instead of a generic one.
 */
const BY_KEY = {
  handyman: Wrench,
  plumbing: Droplets,
  carpentry: Hammer,
  assemblies: Puzzle,
  home_maintenance: Home,
  painting: Paintbrush,
  electricity: Zap,
  cleaning: Sparkles,
  moving: Truck,
  heavy_lifting: Package,
  gardening: Sprout,
  ac: Snowflake,
  locksmith: KeyRound,
  it_support: Laptop,
  pets: PawPrint,
  babysitting: Baby,
  elderly_care: HeartHandshake,
  personal_help: Handshake,
  tutoring: BookOpen,
  fitness: Dumbbell,
  parent_events: PartyPopper,
  other: ClipboardList,
};

/** The icon for a category key — its own, its root's, or a neutral tag. */
export function categoryIcon(key, map) {
  if (!key) return Tag;
  if (BY_KEY[key]) return BY_KEY[key];
  const row = map?.[key];
  const root = row ? rootOf(row, map) : null;
  return (root && BY_KEY[root.category_key]) || Tag;
}
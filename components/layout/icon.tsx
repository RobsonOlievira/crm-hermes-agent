'use client'

import {
  LayoutDashboard, Users, KanbanSquare, Building2, Activity, MessageCircle, CalendarDays,
  CreditCard, FileText, Megaphone, Workflow, UserCog, Blocks, Palette, Mail, Phone,
  CalendarClock, ArrowRightLeft, StickyNote, FileCheck, CheckSquare, Zap, LucideProps,
  GraduationCap, UserCheck, Handshake, Truck, CircleHelp, Tag, Package, Wrench,
  Star, Heart, Briefcase, Rocket, Target, Crown, Gem, ShoppingCart, Store, Contact,
  PhoneCall, Sparkles, Wand2, Tags, DollarSign, Percent, Award, Flame, ThumbsUp, Globe,
  Bot, Clock,
} from 'lucide-react'
import { ComponentType } from 'react'

const ICONS: Record<string, ComponentType<LucideProps>> = {
  LayoutDashboard, Users, KanbanSquare, Building2, Activity, MessageCircle, CalendarDays,
  CreditCard, FileText, Megaphone, Workflow, UserCog, Blocks, Palette, Mail, Phone,
  CalendarClock, ArrowRightLeft, StickyNote, FileCheck, CheckSquare, Zap,
  GraduationCap, UserCheck, Handshake, Truck, CircleHelp, Tag, Package, Wrench,
  Star, Heart, Briefcase, Rocket, Target, Crown, Gem, ShoppingCart, Store, Contact,
  PhoneCall, Sparkles, Wand2, Tags, DollarSign, Percent, Award, Flame, ThumbsUp, Globe,
  Bot, Clock,
}

// Lista de \u00edcones dispon\u00edveis para o seletor de \u00edcones (tipos de lead)
export const ICON_CHOICES = [
  'Tag', 'GraduationCap', 'UserCheck', 'Building2', 'Handshake', 'Truck', 'Users',
  'CircleHelp', 'Star', 'Heart', 'Briefcase', 'Rocket', 'Target', 'Crown', 'Gem',
  'ShoppingCart', 'Store', 'Contact', 'Award', 'Flame', 'ThumbsUp', 'Globe',
]

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Activity
  return <Cmp className={className} />
}

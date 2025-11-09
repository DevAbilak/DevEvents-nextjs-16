import { Schema, model, models, Document } from 'mongoose';

// Strong TS type for Event documents
export interface EventDocument extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // normalized YYYY-MM-DD
  time: string; // normalized HH:mm (24h)
  mode: string; // e.g., online | offline | hybrid
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Util: URL-friendly slug from title
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/["']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// Util: normalize and validate date -> YYYY-MM-DD (ISO date-only)
function normalizeDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date format');
  return d.toISOString().slice(0, 10);
}

// Util: normalize time to HH:mm (24h); accepts `H:mm`, `HH:mm`, `h:mm AM/PM`, optional seconds
function normalizeTime(input: string): string {
  const s = String(input || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) throw new Error('Invalid time format');
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = (m[4] || '').toUpperCase();
  if (min < 0 || min > 59) throw new Error('Invalid time minutes');
  if (ampm) {
    if (h < 1 || h > 12) throw new Error('Invalid time hours');
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
  } else {
    if (h < 0 || h > 23) throw new Error('Invalid time hours');
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Reusable non-empty string schema def
const NonEmptyString = {
  type: String,
  required: true,
  trim: true,
  validate: {
    validator: (v: string) => typeof v === 'string' && v.trim().length > 0,
    message: '{PATH} cannot be empty',
  },
} as const;

const EventSchema = new Schema<EventDocument>(
  {
    title: { ...NonEmptyString },
    slug: { type: String, unique: true, index: true }, // unique index for SEO-friendly URLs
    description: { ...NonEmptyString },
    overview: { ...NonEmptyString },
    image: { ...NonEmptyString },
    venue: { ...NonEmptyString },
    location: { ...NonEmptyString },
    date: { ...NonEmptyString }, // normalized in pre-save
    time: { ...NonEmptyString }, // normalized in pre-save
    mode: { ...NonEmptyString },
    audience: { ...NonEmptyString },
    agenda: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: unknown) =>
          Array.isArray(arr) && arr.length > 0 && arr.every((v) => typeof v === 'string' && v.trim().length > 0),
        message: 'agenda must be a non-empty array of non-empty strings',
      },
      set: (arr: string[]) => Array.isArray(arr) ? arr.map((s) => s.trim()) : arr,
    },
    organizer: { ...NonEmptyString },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: unknown) =>
          Array.isArray(arr) && arr.length > 0 && arr.every((v) => typeof v === 'string' && v.trim().length > 0),
        message: 'tags must be a non-empty array of non-empty strings',
      },
      set: (arr: string[]) => Array.isArray(arr) ? arr.map((s) => s.trim().toLowerCase()) : arr,
    },
  },
  {
    timestamps: true, // createdAt/updatedAt auto-generated
    versionKey: false,
  }
);

// Keep slug unique at the DB level as well
EventSchema.index({ slug: 1 }, { unique: true });

// Pre-save: generate slug (only when title changes) and normalize date/time
EventSchema.pre('save', function (next) {
  try {
    // Slug generation only if title changed
    if (this.isModified('title')) {
      this.slug = slugify(this.title);
    }

    // Normalize date and time consistently
    if (this.isModified('date')) {
      this.date = normalizeDate(this.date);
    }
    if (this.isModified('time')) {
      this.time = normalizeTime(this.time);
    }

    // Final guard: ensure required string fields are still non-empty after trimming
    const requiredStrings: Array<keyof Pick<EventDocument, 'title' | 'description' | 'overview' | 'image' | 'venue' | 'location' | 'date' | 'time' | 'mode' | 'audience' | 'organizer'>> = [
      'title',
      'description',
      'overview',
      'image',
      'venue',
      'location',
      'date',
      'time',
      'mode',
      'audience',
      'organizer',
    ];
    for (const key of requiredStrings) {
      const val = (this as EventDocument)[key];
      if (typeof val !== 'string' || val.trim().length === 0) {
        throw new Error(`${String(key)} cannot be empty`);
      }
    }

    next();
  } catch (err) {
    next(err as Error);
  }
});

const EventModel = (models.Event as ReturnType<typeof model<EventDocument>> | undefined) || model<EventDocument>('Event', EventSchema);

export default EventModel;

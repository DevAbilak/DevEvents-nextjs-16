import { Schema, model, models, Document, Types, model as getModel } from 'mongoose';

export interface BookingDocument extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BookingSchema = new Schema<BookingDocument>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => emailRegex.test(v),
        message: 'email must be a valid email address',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index to speed up event-based lookups
BookingSchema.index({ eventId: 1 });

// Pre-save: ensure referenced Event exists and email is valid
BookingSchema.pre('save', async function (next) {
  try {
    // Re-validate email in case it was programmatically set
    if (!emailRegex.test(this.email)) {
      throw new Error('email must be a valid email address');
    }

    if (this.isNew || this.isModified('eventId')) {
      // Lazy access Event model to avoid circular import issues
      const Event = getModel<import('./event.model').EventDocument>('Event');
      const exists = await Event.exists({ _id: this.eventId });
      if (!exists) throw new Error('Referenced event does not exist');
    }

    next();
  } catch (err) {
    next(err as Error);
  }
});

const BookingModel = (models.Booking as ReturnType<typeof model<BookingDocument>> | undefined) || model<BookingDocument>('Booking', BookingSchema);

export default BookingModel;

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Tên đăng nhập không được để trống.'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Họ tên không được để trống.'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'staff'],
      default: 'staff',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.passwordHash;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ username: 1 });

export const User = mongoose.model('User', userSchema);

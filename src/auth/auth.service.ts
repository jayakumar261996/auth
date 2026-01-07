import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userModel.findOne({ username: dto.username });
    if (existing) throw new ConflictException('User already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userModel.create({
      username: dto.username,
      password: hashedPassword,
    });

    return { message: 'User registered successfully', userId: user._id };
  }

  async validateUser(username: string, password: string) {
    const user = await this.userModel.findOne({ username });
    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException();

    return { id: user._id, username: user.username };
  }

  async login(user: any) {
    const payload = { sub: user.id, username: user.username };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: 'ACCESS_SECRET',
        expiresIn: '15m',
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: 'REFRESH_SECRET',
        expiresIn: '7d',
      }),
      user,
    };
  }

  async refresh(user: any) {
    return {
      access_token: this.jwtService.sign(
        { sub: user.id, username: user.username },
        { secret: 'ACCESS_SECRET', expiresIn: '15m' },
      ),
    };
  }
}

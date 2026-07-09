import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return await this.prisma.user.create({
      data: {
        telegramId: BigInt(createUserDto.telegramId), // Konversi string ke BigInt
        username: createUserDto.username,
        firstName: createUserDto.firstName,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Kita buat objek data secara manual agar tipe datanya terjamin
    const data: any = {
      username: updateUserDto.username,
      firstName: updateUserDto.firstName,
    };

    // Hanya tambahkan telegramId jika ada dan konversi ke BigInt
    if (updateUserDto.telegramId) {
      data.telegramId = BigInt(updateUserDto.telegramId);
    }

    return await this.prisma.user.update({
      where: { id },
      data: data, // Menggunakan objek yang sudah difilter
    });
  }

  // Method lainnya tetap sama
  async findAll() { return await this.prisma.user.findMany(); }
  async findOne(id: string) { return await this.prisma.user.findUnique({ where: { id } }); }
  async remove(id: string) { return await this.prisma.user.delete({ where: { id } }); }
}
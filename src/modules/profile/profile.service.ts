import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProfileType } from 'src/common/types/profile.types';
import { UserEntity } from '../user/user.entity';
import { Repository } from 'typeorm';
import { ProfileResponse } from 'src/common/types/profileResponse.interface';

@Injectable()
export class ProfileService {

    constructor(@InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>) {}

    async getProfile(userId: number, profileUsername: string): Promise<ProfileType> {
        const user = await this.userRepository.findOne({ 
            where: { username: profileUsername } 
        });
        if(!user) {
            throw new HttpException('Profile does not exist', HttpStatus.NOT_FOUND);
        }

        return {
            ...user,
            following: false
        };
    }

    buildProfileResponse(profile: ProfileType): ProfileResponse {
        const { email, ...profileWithoutEmail } = profile;
        return { profile: profileWithoutEmail as ProfileType };
    }

}

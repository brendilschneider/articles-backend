import { UserType } from "./user.type";

export type ProfileType =  UserType & {
    following: boolean;
};
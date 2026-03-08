import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Plant {
    growthStage: bigint;
    waterCount: bigint;
    seedType: string;
}
export interface Garden {
    stats: GardenStats;
    plots: Array<Plant | null>;
}
export interface UserProfile {
    name: string;
}
export interface GardenStats {
    totalBlooms: bigint;
    totalWaters: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearPlot(plotIndex: bigint): Promise<void>;
    getAllGardens(): Promise<Array<[Principal, Garden]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGarden(): Promise<Garden>;
    getStats(): Promise<GardenStats>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    plantSeed(plotIndex: bigint, seedType: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    waterPlant(plotIndex: bigint): Promise<void>;
}

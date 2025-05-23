import type { Gym, Price } from '../../types/index.js';

export class GymModel implements Gym {
  constructor(
    public name: string,
    public area: string,
    public prefecture: string,
    public city: string,
    public address: string,
    public prices: Price[],
    public url: string,
    public features: string[],
    public description?: string,
    public isPersonal: boolean = false,
    public isPersonalReason?: string
  ) {}

  static fromRaw(raw: any): GymModel {
    return new GymModel(
      raw.name || '',
      raw.area || '',
      raw.prefecture || '',
      raw.city || '',
      raw.address || '',
      raw.prices || [],
      raw.url || '',
      raw.features || [],
      raw.description,
      raw.isPersonal || false,
      raw.isPersonalReason
    );
  }

  toJSON(): Gym {
    const result: any = {
      name: this.name,
      area: this.area,
      prefecture: this.prefecture,
      city: this.city,
      address: this.address,
      prices: this.prices,
      url: this.url,
      features: this.features,
      isPersonal: this.isPersonal
    };

    if (this.description !== undefined) {
      result.description = this.description;
    }

    if (this.isPersonalReason !== undefined) {
      result.isPersonalReason = this.isPersonalReason;
    }

    return result as Gym;
  }
}
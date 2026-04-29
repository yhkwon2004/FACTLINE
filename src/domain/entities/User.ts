export interface UserProps {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  public readonly id: string;
  public email: string;
  public name: string;
  public passwordHash?: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.passwordHash = props.passwordHash;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}


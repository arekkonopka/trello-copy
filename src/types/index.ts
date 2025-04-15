import { PureAbility } from '@casl/ability'

export type TRoleAction = 'create' | 'read' | 'update' | 'delete' | 'manage'
export type TRoleSubject = 'user' | 'ticket' | 'attachment' | 'all'
export type TRole = 'admin' | 'user'

export type AppAbility = PureAbility<[TRoleAction, TRoleSubject]>

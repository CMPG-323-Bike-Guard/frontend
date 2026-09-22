//User
export type UserRole = 'student' | 'staff' | 'guard' | 'admin'
export type AccountStatus = 'active' | 'suspended' | 'deactivated'

export interface User{
    user_id: string
    student_number: string
    name: string
    role: UserRole
    account_status: AccountStatus
    password_hash: string
    photo_path: string | null
    created_at: string
    updated_at: string
}

//Bike
export type BikeStatus = 'active' | 'inactive' | 'stolen'

export interface Bike{
    bike_id: string
    user_id: string
    bike_name: string
    make: string | null
    model: string | null
    colour: string | null
    photo_path: string | null
    status: BikeStatus
    created_at: string
}

//RFID Tag
export type TagStatus = 'active' | 'lost' | 'deactivated'

export interface RFIDTag{
    tag_id: string
    bike_id: string
    tag_hmac: string
    status: TagStatus
    issued_at: string
    deactivated_at: string | null
}

//Cards
export type CardStatus = 'active' | 'lost' | 'deactivated'

export interface Card{
    card_id: string
    user_id: string
    card_hmac: string
    status: CardStatus
}

//Bike Permissions
export type PermissionStatus = 'active' | 'revoked'

export interface BikePermission{
    permission_id: string
    bike_id: string
    authorizer_id: string
    guest_id: string
    status: PermissionStatus
    granted_at: string
    revoked_at: string | null
}

//Lost Tag Reports
export type LostReportStatus = 'open' | 'resolved' | 'cancelled'

export interface LostTagReports{
    report_id: string
    tag_id: string
    user_id: string
    reported_time: string
    status: LostReportStatus
    notes: string | null
}

//Gates
export type GateStatus = 'active' | 'inactive' | 'maintenance'

export interface Gate{
    gate_id: string
    gate_name: string
    gate_address: string
    status: GateStatus
}

//Gate Events
export type GateEventResult = 'allowed'| 'mismatch' | 'unknown_tag' | 'unknown_card' | 'inactive_tag' | 'inactive_card'

export interface GateEvent{
    event_id: string
    timestamp: string
    gate_id: string
    card_id: string | null
    tag_id: string | null
    bike_id: string | null
    permission_id: string | null
    result: GateEventResult
}


//Alarms
export type AlarmResolution = 'unresolved' | 'cleared' | 'escalated'

export interface Alarm{
    alarm_id: string
    event_id: string
    guard_id: string | null
    resolution: AlarmResolution
    notes: string | null
}
import { IWithdrawalMessage } from "@/domain/withdrawal/interfaces/message"

export type WithdrawalContext = {
  request: IWithdrawalMessage
  amountInMinorUnits: bigint
}

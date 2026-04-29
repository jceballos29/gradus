"use client"

import { ComponentProps } from "react"

export function AutoSubmitSelect({ children, ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      onChange={(e) => {
        e.target.form?.submit()
      }}
    >
      {children}
    </select>
  )
}

#!/bin/bash
# This script will help identify the endpoints that need fixing
grep -n "protectedProcedure" server/mobileApi.ts | grep -A 20 "ctx.user.id"

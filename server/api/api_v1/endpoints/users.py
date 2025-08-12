from fastapi import APIRouter, HTTPException
from server.schemas import schema
from server.crud import crud_user

router = APIRouter()

# The registration logic has been moved to the auth endpoint.
# This file can be used for other user-related operations in the future,
# such as getting user profiles, etc.
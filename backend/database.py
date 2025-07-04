from sqlalchemy import create_engine  # type: ignore
from sqlalchemy.ext.declarative import declarative_base  # type: ignore
from sqlalchemy.orm import sessionmaker  # type: ignore
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL - for production use Neon PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://myuser:mypassword@localhost/chatapp")

# Create database engine with SSL support for production
if "neon.tech" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})
else:
    engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for declarative models
Base = declarative_base() 
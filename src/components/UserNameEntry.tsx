"use client";

import { useState, useEffect } from "react";

interface UserNameEntryProps {
  onNameSubmit: (userName: string) => void;
  initialValue?: string;
  title?: string;
  submitButtonText?: string;
  onBack?: () => void;
  currentUsername?: string; // For excluding current username from validation
}

export default function UserNameEntry({
  onNameSubmit,
  initialValue = "",
  title = "Welcome!",
  submitButtonText = "Continue",
  onBack,
  currentUsername,
}: UserNameEntryProps) {
  const [userName, setUserName] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [existingUsers, setExistingUsers] = useState<string[]>([]);

  // Fetch existing users to check for duplicates
  useEffect(() => {
    const fetchExistingUsers = async () => {
      try {
        const response = await fetch("http://localhost:8000/users");
        if (response.ok) {
          const data = await response.json();
          setExistingUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch existing users:", err);
      }
    };

    fetchExistingUsers();
  }, []);

  const validateUserName = (name: string): string | null => {
    if (!name.trim()) {
      return "Username is required";
    }

    const minLength = parseInt(
      process.env.NEXT_PUBLIC_MIN_USERNAME_LENGTH || "2"
    );
    const maxLength = parseInt(
      process.env.NEXT_PUBLIC_MAX_USERNAME_LENGTH || "20"
    );

    if (name.length < minLength) {
      return `Username must be at least ${minLength} characters long`;
    }

    if (name.length > maxLength) {
      return `Username must be less than ${maxLength} characters`;
    }

    const usernameRegex =
      process.env.NEXT_PUBLIC_USERNAME_REGEX || "^[a-zA-Z0-9_-]+$";
    if (!new RegExp(usernameRegex).test(name)) {
      return "Username can only contain letters, numbers, hyphens, and underscores";
    }

    // Don't check against existing users if this is the current user's name
    if (existingUsers.includes(name) && name !== currentUsername) {
      return "This username is already taken";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateUserName(userName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      // Double-check with server to ensure username is still available
      const response = await fetch("http://localhost:8000/users/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userName,
          current_username: currentUsername,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.available) {
          onNameSubmit(userName);
        } else {
          setError("This username is already taken");
        }
      } else {
        setError("Failed to validate username");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsChecking(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserName(value);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card-standard p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-heading-1 mb-2">{title}</h1>
            <p className="text-body-small">
              {title === "Welcome!"
                ? "Enter your username to start collaborating"
                : "Choose a new username"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-standard">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                value={userName}
                onChange={handleInputChange}
                className={`input-standard ${error ? "error" : ""}`}
                placeholder="Enter your username"
                autoComplete="off"
                autoFocus
                disabled={isChecking}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <div className="space-compact">
              <button
                type="submit"
                disabled={isChecking || !userName.trim()}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isChecking || !userName.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "btn-primary"
                }`}
              >
                {isChecking ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Checking...
                  </div>
                ) : (
                  submitButtonText
                )}
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full btn-secondary py-3 px-4"
                >
                  Back
                </button>
              )}
            </div>
          </form>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-body-small">Username requirements:</p>
            <ul className="text-caption mt-1 space-y-1">
              <li>• 2-20 characters long</li>
              <li>• Letters, numbers, hyphens, and underscores only</li>
              <li>• Must be unique</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

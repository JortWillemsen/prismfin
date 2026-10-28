import React, { useState, useRef, useEffect } from "react";
import "./glass-dropdown.scss";

export interface DropdownOption {
    label: string;
    value: string | number;
}

interface GlassDropdownProps {
    options: DropdownOption[] | string[];
    value?: string | number;
    values?: (string | number)[];
    isMultiSelect?: boolean;
    onChange: (val: any) => void;
    placeholder?: string;
    ariaLabel?: string;
    className?: string;
    showChevron?: boolean;
    direction?: "down" | "up";
    disabled?: boolean;
}

export const GlassDropdown: React.FC<GlassDropdownProps> = ({
    options,
    value,
    values = [],
    isMultiSelect = false,
    onChange,
    placeholder = "Select...",
    ariaLabel = "Dropdown",
    className = "",
    showChevron = false,
    direction = "down",
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const normalizedOptions: DropdownOption[] = options.map((opt) =>
        typeof opt === "string" ? { label: opt, value: opt } : opt
    );

    const closeDropdown = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 180);
    };

    const toggleOpen = () => {
        if (isOpen) {
            closeDropdown();
        } else {
            setIsOpen(true);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                if (isOpen) closeDropdown();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                closeDropdown();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const handleSelect = (optValue: string | number) => {
        if (isMultiSelect) {
            const currentSelected = Array.isArray(values) ? values : [];
            const isAllOption =
                String(optValue).toLowerCase().startsWith("all") ||
                optValue === "";

            if (isAllOption) {
                onChange([]);
                return;
            }

            const exists = currentSelected.includes(optValue);
            const next = exists
                ? currentSelected.filter((v) => v !== optValue)
                : [...currentSelected, optValue];
            onChange(next);
        } else {
            onChange(optValue);
            closeDropdown();
        }
    };

    let displayLabel = placeholder;
    if (isMultiSelect) {
        const selectedList = Array.isArray(values) ? values : [];
        if (selectedList.length === 0) {
            displayLabel = placeholder;
        } else if (selectedList.length === 1) {
            const matched = normalizedOptions.find(
                (o) => o.value === selectedList[0]
            );
            displayLabel = matched ? matched.label : String(selectedList[0]);
        } else {
            displayLabel = `${placeholder} (${selectedList.length})`;
        }
    } else {
        const selectedOption = normalizedOptions.find((o) => o.value === value);
        if (selectedOption) {
            displayLabel = selectedOption.label;
        }
    }

    return (
        <div
            className={`glass-dropdown ${direction === "up" ? "direction-up" : ""} ${disabled ? "disabled" : ""} ${className}`}
            ref={containerRef}
        >
            <button
                type="button"
                className={`dropdown-trigger ${isOpen ? "open" : ""}`}
                onClick={toggleOpen}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-expanded={isOpen}
            >
                <span>{displayLabel}</span>
                {showChevron && (
                    <img
                        src="/assets/images/arrow-down.svg"
                        alt="Open"
                        className="dropdown-chevron"
                    />
                )}
            </button>

            {isOpen && (
                <div className={`dropdown-menu ${isClosing ? "closing" : ""}`}>
                    {normalizedOptions.map((opt) => {
                        const isAllOption =
                            String(opt.value).toLowerCase().startsWith("all") ||
                            opt.value === "";
                        const isSelected = isMultiSelect
                            ? isAllOption
                                ? !values || values.length === 0
                                : values?.includes(opt.value)
                            : opt.value === value;

                        return (
                            <div
                                key={String(opt.value)}
                                className={`dropdown-item ${isSelected ? "selected" : ""}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                <span>{opt.label}</span>
                                {isSelected && <span>✓</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

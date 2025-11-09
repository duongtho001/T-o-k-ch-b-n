import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import type { DropdownOption, DropdownGroup } from '../types';
import { playSound } from '../utils/soundUtils';
import { OPEN_SOUND, SELECT_SOUND } from '../assets/sounds';

interface SearchableDropdownProps {
    groups: DropdownGroup[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    labelId: string;
    allOptions: DropdownOption[];
    areSoundsEnabled: boolean;
}

const ChevronDownIcon = () => (
    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);


const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ groups, value, onChange, placeholder = "Search...", labelId, allOptions, areSoundsEnabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxRef = useRef<HTMLUListElement>(null);
    const listboxId = useId();
    const buttonId = useId();

    const selectedOption = allOptions.find(option => option.id === value);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groups;
        return groups.map(group => {
            const filteredOptions = group.options.filter(option =>
                option.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return { ...group, options: filteredOptions };
        }).filter(group => group.options.length > 0);
    }, [searchTerm, groups]);

    const navigableOptions = useMemo(() => filteredGroups.flatMap(g => g.options), [filteredGroups]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            const initialIndex = navigableOptions.findIndex(opt => opt.id === value);
            setActiveIndex(initialIndex !== -1 ? initialIndex : 0);
        }
    }, [isOpen, navigableOptions, value]);

    useEffect(() => {
        setActiveIndex(0);
    }, [searchTerm]);

    useEffect(() => {
        if (activeIndex >= 0 && listboxRef.current) {
            const activeElement = listboxRef.current.querySelector(`[data-nav-index="${activeIndex}"]`);
            activeElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    const handleSelect = (optionId: string) => {
        playSound(SELECT_SOUND, areSoundsEnabled);
        onChange(optionId);
        setIsOpen(false);
        setSearchTerm("");
    };
    
    const handleToggleOpen = () => {
        playSound(OPEN_SOUND, areSoundsEnabled);
        setIsOpen(!isOpen);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % navigableOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + navigableOptions.length) % navigableOptions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < navigableOptions.length) {
                handleSelect(navigableOptions[activeIndex].id);
            }
        }
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                id={buttonId}
                type="button"
                onClick={handleToggleOpen}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-labelledby={`${labelId} ${buttonId}`}
                className="w-full flex justify-between items-center py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
                <span className="truncate">{selectedOption ? selectedOption.name : 'Chọn một tùy chọn'}</span>
                <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </span>
            </button>

            {isOpen && (
                <div 
                    className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-300 dark:border-gray-600"
                    onKeyDown={handleKeyDown}
                >
                    <div className="p-2">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={placeholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-autocomplete="list"
                            aria-controls={listboxId}
                            className="w-full py-1 px-2 border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <ul 
                        ref={listboxRef}
                        id={listboxId}
                        role="listbox"
                        aria-labelledby={labelId}
                        tabIndex={-1}
                        className="max-h-60 overflow-auto focus:outline-none"
                    >
                        {filteredGroups.length > 0 ? (
                            filteredGroups.map(group => (
                                <React.Fragment key={group.name}>
                                    {groups.length > 1 && (
                                        <li role="presentation" className="px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                                            {group.name}
                                        </li>
                                    )}
                                    {group.options.map(option => {
                                        const currentNavIndex = navigableOptions.findIndex(o => o.id === option.id);
                                        const isSelected = value === option.id;
                                        const isActive = navigableOptions[activeIndex]?.id === option.id;

                                        return (
                                            <li
                                                key={option.id}
                                                id={`${listboxId}-option-${option.id}`}
                                                role="option"
                                                aria-selected={isSelected}
                                                data-nav-index={currentNavIndex}
                                                onClick={() => handleSelect(option.id)}
                                                className={`px-3 py-2 cursor-pointer ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50' : ''} ${isSelected ? 'font-semibold text-indigo-800 dark:text-indigo-200' : ''} hover:bg-indigo-100 dark:hover:bg-indigo-900/50`}
                                            >
                                                {option.name}
                                            </li>
                                        );
                                    })}
                                </React.Fragment>
                            ))
                        ) : (
                            <li className="px-3 py-2 text-gray-500 italic">Không tìm thấy lựa chọn.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchableDropdown;
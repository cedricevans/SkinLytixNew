import { ReactNode } from 'react';

interface BrandNameProps {
  children?: ReactNode;
}

/**
 * Reusable component for displaying the SkinLytix brand name with trademark symbol.
 * Use this component anywhere the brand name appears in the UI.
 * 
 * @example
 * // Simple usage
 * <BrandName />
 * 
 * @example
 * // With suffix (e.g., "SkinLytix (TM) Analyzer")
 * <BrandName> Analyzer</BrandName>
 */
const BrandName = ({ children }: BrandNameProps) => {
  return (
    <>
      SkinLytix<sup className="text-[0.6em]">(TM)</sup>{children}
    </>
  );
};

export default BrandName;

import { ReactNode } from 'react';

interface BrandNameProps {
  children?: ReactNode;
}

/**
 * Reusable component for displaying the SkinLytix brand name.
 * Use this component anywhere the brand name appears in the UI.
 * 
 * @example
 * // Simple usage
 * <BrandName />
 * 
 * @example
 * // With suffix (e.g., "SkinLytix Analyzer")
 * <BrandName> Analyzer</BrandName>
 */
const BrandName = ({ children }: BrandNameProps) => {
  return (
    <>
      SkinLytix{children}
    </>
  );
};

export default BrandName;

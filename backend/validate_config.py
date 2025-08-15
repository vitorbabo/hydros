#!/usr/bin/env python3
"""
Configuration Validation CLI Tool

Standalone script for validating Hydros configuration files.
Useful for CI/CD, pre-deployment checks, and development.

Usage:
    python validate_config.py [--config-path CONFIG_PATH] [--site-ids SITE1 SITE2 ...]

Examples:
    # Validate all configurations in default location
    python validate_config.py

    # Validate specific site
    python validate_config.py --site-ids wtp-porto-01

    # Validate configurations in custom location
    python validate_config.py --config-path /custom/config/path
"""

import argparse
import sys
from pathlib import Path

# Add backend directory to path so we can import modules
sys.path.insert(0, str(Path(__file__).parent))

from core.config_validator import validate_configurations_cli


def main():
    """Main entry point for configuration validation CLI."""
    parser = argparse.ArgumentParser(
        description="Validate Hydros configuration files using JSON schemas",
        epilog="""
Examples:
  %(prog)s                              # Validate all configurations
  %(prog)s --site-ids wtp-porto-01      # Validate specific site
  %(prog)s --config-path /path/to/config # Custom config directory
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--config-path", help="Path to configuration directory (default: ./config)"
    )

    parser.add_argument(
        "--site-ids", nargs="*", help="Site IDs to validate (default: all found sites)"
    )

    parser.add_argument(
        "--quiet", "-q", action="store_true", help="Only show errors and final result"
    )

    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show detailed validation information",
    )

    args = parser.parse_args()

    # Set up logging level based on verbosity
    import logging

    if args.quiet:
        logging.basicConfig(level=logging.ERROR)
    elif args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    # Run validation
    exit_code = validate_configurations_cli(args.config_path, args.site_ids)

    # Provide specific guidance on exit codes
    if exit_code == 0:
        if not args.quiet:
            print("\n🎉 Configuration validation completed successfully!")
            print("All configuration files are valid and ready for deployment.")
    else:
        print("\n❌ Configuration validation failed!")
        print("Please fix the validation errors before deploying.")
        print("\nHelpful tips:")
        print("  • Check that all required fields are present")
        print("  • Verify that referenced modules exist in templates")
        print("  • Ensure parameter values are within valid ranges")
        print("  • Validate YAML syntax using an online YAML validator")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())

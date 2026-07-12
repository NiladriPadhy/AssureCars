package com.vsp.core.data.report

import com.vsp.core.model.Vehicle

/** Shared vehicle detail rows for PDF/HTML report rendering. */
object VehicleReportDetails {

    data class Row(val label: String, val value: String)

    private fun display(value: String?): String = value?.takeIf { it.isNotBlank() } ?: "—"

    private fun display(value: Int?): String = value?.toString() ?: "—"

    /** Every standard vehicle attribute, using [—] when the value is missing. */
    fun rows(vehicle: Vehicle, includeCategory: Boolean = true): List<Row> = buildList {
        add(Row("Manufacturer", display(vehicle.manufacturer)))
        add(Row("Make", display(vehicle.make)))
        add(Row("Model", display(vehicle.model)))
        add(Row("Variant", display(vehicle.variant)))
        add(Row("Trim", display(vehicle.trim)))
        add(Row("Year", display(vehicle.year)))
        add(Row("Body style", display(vehicle.bodyStyle)))
        add(Row("Fuel type", display(vehicle.fuelType)))
        add(Row("Transmission", display(vehicle.transmission)))
        add(Row("Color", display(vehicle.color)))
        add(Row("VIN", display(vehicle.vin)))
        add(Row("Registration number", display(vehicle.registrationNumber)))
        add(Row("Engine number", display(vehicle.engineNumber)))
        add(Row("Chassis number", display(vehicle.chassisNumber)))
        add(Row("Odometer", vehicle.odometerKm?.let { "$it km" } ?: "—"))
        add(Row("Number of ownerships", display(vehicle.numberOfOwnerships)))
        add(Row("Number of keys", display(vehicle.numberOfKeys)))
        if (includeCategory) add(Row("Category", vehicle.category.name))
    }

    fun subtitle(vehicle: Vehicle): String = listOfNotNull(
        vehicle.variant ?: vehicle.trim,
        vehicle.year?.toString(),
        vehicle.bodyStyle,
        vehicle.transmission,
        vehicle.fuelType,
    ).joinToString("  |  ")

    fun rows(dto: ReportVehicleDto, includeCategory: Boolean = true): List<Row> = buildList {
        add(Row("Manufacturer", display(dto.manufacturer)))
        add(Row("Make", display(dto.make)))
        add(Row("Model", display(dto.model)))
        add(Row("Variant", display(dto.variant)))
        add(Row("Trim", display(dto.trim)))
        add(Row("Year", display(dto.year)))
        add(Row("Body style", display(dto.bodyStyle)))
        add(Row("Fuel type", display(dto.fuelType)))
        add(Row("Transmission", display(dto.transmission)))
        add(Row("Color", display(dto.color)))
        add(Row("VIN", display(dto.vin)))
        add(Row("Registration number", display(dto.registrationNumber)))
        add(Row("Engine number", display(dto.engineNumber)))
        add(Row("Chassis number", display(dto.chassisNumber)))
        add(Row("Odometer", dto.odometerKm?.let { "$it km" } ?: "—"))
        add(Row("Number of ownerships", display(dto.numberOfOwnerships)))
        add(Row("Number of keys", display(dto.numberOfKeys)))
        if (includeCategory) add(Row("Category", dto.category))
    }

    fun subtitle(dto: ReportVehicleDto): String = listOfNotNull(
        dto.variant ?: dto.trim,
        dto.year?.toString(),
        dto.bodyStyle,
        dto.transmission,
        dto.fuelType,
    ).joinToString("  •  ")
}

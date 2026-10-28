import React from "react";
import { PersonItem } from "@/common/types/media";
import { useApp } from "@/application/state/appContext";
import { getImageUrl } from "@/common/utils/image";
import "./person-card.scss";

interface PersonCardProps {
    person: PersonItem;
}

export const PersonCard: React.FC<PersonCardProps> = ({ person }) => {
    const { session } = useApp();
    const serverUrl = session?.serverUrl || "";

    const imageUrl = person.primaryImageTag
        ? getImageUrl(serverUrl, person.id, "Primary", {
              tag: person.primaryImageTag,
              maxWidth: 300,
              quality: 80,
          })
        : "";

    return (
        <div className="person-card">
            <div className="person-image-wrapper">
                {imageUrl ? (
                    <img src={imageUrl} alt={person.name} loading="lazy" />
                ) : (
                    <div className="person-placeholder">
                        <img src="/assets/images/person.svg" alt="Person" />
                    </div>
                )}
            </div>
            <div className="person-name">{person.name}</div>
            {person.role && <div className="person-role">{person.role}</div>}
        </div>
    );
};
